

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const AudioRecordingWorklet = `
class AudioProcessingWorklet extends AudioWorkletProcessor {

  // Buffer size 128 matches the Web Audio API render quantum (approx 8ms at 16kHz)
  buffer = new Int16Array(128);
  bufferWriteIndex = 0;
  
  // Metrics
  sumSquares = 0;
  clipped = false;
  
  // 1. High-Pass Filter (Butterworth)
  // Cutoff 110Hz to aggressively remove rumble/hum/wind while keeping voice body.
  hpf = { x1:0, x2:0, y1:0, y2:0, b0:0, b1:0, b2:0, a1:0, a2:0 };

  // 2. Presence Filter (Peaking EQ)
  // Boost 3.5kHz to enhance consonant clarity/intelligibility for STT.
  peak = { x1:0, x2:0, y1:0, y2:0, b0:0, b1:0, b2:0, a1:0, a2:0 };

  // Analog saturation drive
  // Boosted to 4.0x to ensure maximum STT pickup for quiet voices
  preGain = 4.0; 

  // Noise Gate
  // Crushed to 0.001 to prevent cutting off word starts/ends. 
  gateThreshold = 0.001; 
  gateRelease = 0.9995; // Slower release to prevent choppy trails
  gateEnvelope = 0.0;

  constructor() {
    super();
    // 1. High Pass to cut mud
    this.calculateHPF(110);
    // 2. Presence Boost to enhance voice clarity/focus (+4dB at 3.5kHz)
    this.calculatePeaking(3500, 1.0, 4.0);
    
    this.port.onmessage = this.handleMessage.bind(this);
  }

  calculateHPF(frequency) {
    const nyquist = sampleRate / 2;
    const normalizedFreq = frequency / nyquist;
    
    // Butterworth Q
    const Q = 0.7071; 
    const w0 = 2 * Math.PI * normalizedFreq;
    const alpha = Math.sin(w0) / (2 * Q);
    const cosw0 = Math.cos(w0);

    const a0 = 1 + alpha;
    
    // HPF Coefficients
    this.hpf.b0 = ((1 + cosw0) / 2) / a0;
    this.hpf.b1 = (-(1 + cosw0)) / a0;
    this.hpf.b2 = ((1 + cosw0) / 2) / a0;
    this.hpf.a1 = (-2 * cosw0) / a0;
    this.hpf.a2 = (1 - alpha) / a0;
  }

  calculatePeaking(frequency, Q, gainDB) {
    const w0 = 2 * Math.PI * frequency / sampleRate;
    const alpha = Math.sin(w0) / (2 * Q);
    const A = Math.pow(10, gainDB / 40);
    const cosw0 = Math.cos(w0);
    
    const a0 = 1 + alpha / A;
    
    this.peak.b0 = (1 + alpha * A) / a0;
    this.peak.b1 = (-2 * cosw0) / a0;
    this.peak.b2 = (1 - alpha * A) / a0;
    this.peak.a1 = (-2 * cosw0) / a0;
    this.peak.a2 = (1 - alpha / A) / a0;
  }

  handleMessage(event) {
    if (event.data.type === 'configure') {
      if (event.data.threshold !== undefined) this.gateThreshold = event.data.threshold;
      if (event.data.release !== undefined) this.gateRelease = event.data.release;
    }
  }

  process(inputs) {
    if (inputs[0].length) {
      const channel0 = inputs[0][0];
      this.processChunk(channel0);
    }
    return true;
  }

  sendAndClearBuffer(){
    const rms = Math.sqrt(this.sumSquares / this.bufferWriteIndex);
    
    this.port.postMessage({
      event: "chunk",
      data: {
        int16arrayBuffer: this.buffer.slice(0, this.bufferWriteIndex).buffer,
        volume: rms,
        clipped: this.clipped
      },
    });
    this.bufferWriteIndex = 0;
    this.sumSquares = 0;
    this.clipped = false;
  }

  processChunk(float32Array) {
    const l = float32Array.length;
    
    for (let i = 0; i < l; i++) {
      let sample = float32Array[i];
      
      // 1. Apply Biquad High-Pass Filter (Direct Form I)
      let y = this.hpf.b0 * sample + this.hpf.b1 * this.hpf.x1 + this.hpf.b2 * this.hpf.x2 - this.hpf.a1 * this.hpf.y1 - this.hpf.a2 * this.hpf.y2;
      this.hpf.x2 = this.hpf.x1; this.hpf.x1 = sample;
      this.hpf.y2 = this.hpf.y1; this.hpf.y1 = y;
      sample = y;

      // 2. Apply Peaking Filter (Presence Boost)
      y = this.peak.b0 * sample + this.peak.b1 * this.peak.x1 + this.peak.b2 * this.peak.x2 - this.peak.a1 * this.peak.y1 - this.peak.a2 * this.peak.y2;
      this.peak.x2 = this.peak.x1; this.peak.x1 = sample;
      this.peak.y2 = this.peak.y1; this.peak.y1 = y;
      sample = y;

      // 3. Noise Gate (Soft)
      const absSample = Math.abs(sample);
      let targetGain = 0.0;
      
      if (absSample > this.gateThreshold) {
        targetGain = 1.0;
        this.gateEnvelope = 1.0; 
      } else {
        this.gateEnvelope *= this.gateRelease;
        targetGain = this.gateEnvelope;
      }
      sample *= targetGain;

      // 4. Pre-gain for analog drive (Sensitivity Boost)
      sample *= this.preGain;

      // 5. Soft Clipping (Analog Saturation)
      sample = Math.tanh(sample);

      // 6. RMS accumulation
      this.sumSquares += sample * sample;

      // 7. Output conversion
      let int16Value = sample * 32767;

      if (Math.abs(int16Value) >= 32700) {
        this.clipped = true;
      }
      
      this.buffer[this.bufferWriteIndex++] = int16Value;
      if(this.bufferWriteIndex >= this.buffer.length) {
        this.sendAndClearBuffer();
      }
    }
  }
}
`;

export default AudioRecordingWorklet;