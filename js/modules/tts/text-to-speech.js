import * as ort from '/js/libs/onnx/ort.all.bundle.min.mjs';
import { UnicodeProcessor } from './unicode-processor.js';
import { TTSProcessor } from './tts-processor.js';
import { Style } from './style.js';


class TextToSpeech {

  /*
   * Constants
   */

  // Default voice
  static DEFAULT_VOICE = 'F1';

  // Base path of voices
  // static VOICES_BASE_PATH = '/static/onnx/voice_styles';
  static VOICES_BASE_PATH = 'https://supertone-supertonic-2.static.hf.space/assets/voice_styles';

  // Base path of models
  // static MODELS_BASE_PATH = '/static/onnx/onnx';
  static MODELS_BASE_PATH = 'https://supertone-supertonic-2.static.hf.space/assets/onnx';


  /*
   * Attributes
   */

  indexer = null;
  ttsProcessor = null;
  cfgs = null;
  currentStyle = null;
  currentVoice = TextToSpeech.DEFAULT_VOICE;
  isActive = false;


  /*
   * Constructor
   */
  constructor() {

  }


  /*
   * Load voice styles from JSON files
   */
  async loadVoiceStyle(voiceStylePaths) {
    const bsz = voiceStylePaths.length;
    // Read first file to get dimensions
    const firstResponse = await fetch(voiceStylePaths[0]);
    const firstStyle = await firstResponse.json();
    const ttlDims = firstStyle.style_ttl.dims;
    const dpDims = firstStyle.style_dp.dims;
    const ttlDim1 = ttlDims[1];
    const ttlDim2 = ttlDims[2];
    const dpDim1 = dpDims[1];
    const dpDim2 = dpDims[2];
    // Pre-allocate arrays with full batch size
    const ttlSize = bsz * ttlDim1 * ttlDim2;
    const dpSize = bsz * dpDim1 * dpDim2;
    const ttlFlat = new Float32Array(ttlSize);
    const dpFlat = new Float32Array(dpSize);
    // Fill in the data
    for (let i = 0; i < bsz; i++) {
      const response = await fetch(voiceStylePaths[i]);
      const voiceStyle = await response.json();
      // Flatten TTL data
      const ttlData = voiceStyle.style_ttl.data.flat(Infinity);
      const ttlOffset = i * ttlDim1 * ttlDim2;
      ttlFlat.set(ttlData, ttlOffset);
      // Flatten DP data
      const dpData = voiceStyle.style_dp.data.flat(Infinity);
      const dpOffset = i * dpDim1 * dpDim2;
      dpFlat.set(dpData, dpOffset);
    }
    const ttlShape = [bsz, ttlDim1, ttlDim2];
    const dpShape = [bsz, dpDim1, dpDim2];
    const ttlTensor = new ort.Tensor('float32', ttlFlat, ttlShape);
    const dpTensor = new ort.Tensor('float32', dpFlat, dpShape);
    return new Style(ttlTensor, dpTensor);
  }

  /*
   * Load single voice style from JSON
   */
  async loadStyleFromJSON(voice) {
    try {
      const stylePath = `${TextToSpeech.VOICES_BASE_PATH}/${voice}.json`;
      const style = await this.loadVoiceStyle([stylePath], true);
      this.currentVoice = voice;
      return style;
    } catch (error) {
      console.error('Error loading voice style:', error);
      throw error;
    }
  }

  /*
   * Load configuration from JSON
   */
  async loadCfgs(onnxDir) {
    const response = await fetch(`${onnxDir}/tts.json`);
    const cfgs = await response.json();
    return cfgs;
  }

  /*
   * Load text processor
   */
  async loadTextProcessor(onnxDir) {
    const response = await fetch(`${onnxDir}/unicode_indexer.json`);
    const indexer = await response.json();
    return new UnicodeProcessor(indexer);
  }

  /*
   * Load ONNX model
   */
  async loadOnnx(onnxPath, options) {
    const session = await ort.InferenceSession.create(onnxPath, options);
    return session;
  }

  /*
   * Load all TTS components
   */
  async loadTextToSpeech(onnxDir, sessionOptions={}, progressCallback=null) {
    this.cfgs = await this.loadCfgs(onnxDir);
    
    const dpPath = `${onnxDir}/duration_predictor.onnx`;
    const textEncPath = `${onnxDir}/text_encoder.onnx`;
    const vectorEstPath = `${onnxDir}/vector_estimator.onnx`;
    const vocoderPath = `${onnxDir}/vocoder.onnx`;
    
    const modelPaths = [
      { name: 'Duration Predictor', path: dpPath },
      { name: 'Text Encoder', path: textEncPath },
      { name: 'Vector Estimator', path: vectorEstPath },
      { name: 'Vocoder', path: vocoderPath }
    ];
    
    const sessions = [];
    for (let i = 0; i < modelPaths.length; i++) {
      if (progressCallback) {
        progressCallback(modelPaths[i].name, i + 1, modelPaths.length);
      }
      const session = await this.loadOnnx(modelPaths[i].path, sessionOptions);
      sessions.push(session);
    }
    
    const [dpOrt, textEncOrt, vectorEstOrt, vocoderOrt] = sessions;
    
    const textProcessor = await this.loadTextProcessor(onnxDir);
    
    const ttsProcessor = new TTSProcessor(
      this.cfgs,
      textProcessor,
      dpOrt,
      textEncOrt,
      vectorEstOrt,
      vocoderOrt
    );
    
    return { ttsProcessor };
  }

  /* 
   * Load models
   */
  async initializeModels() {
    try {
      // Try WebGPU first, fallback to WASM
      try {
        const result = await this.loadTextToSpeech(
          TextToSpeech.MODELS_BASE_PATH, {
            executionProviders: ['webgpu'],
            graphOptimizationLevel: 'all'
          }, (modelName, current, total) => {
            //
          }
        );
        this.ttsProcessor = result.ttsProcessor;
      } catch (webgpuError) {
        console.log('WebGPU not available, falling back to WebAssembly');
        const result = await this.loadTextToSpeech(
          TextToSpeech.MODELS_BASE_PATH, {
            executionProviders: ['wasm'],
            graphOptimizationLevel: 'all'
          }, (modelName, current, total) => {
            //
          }
        );
        this.ttsProcessor = result.ttsProcessor;
      }
      // Load default voice style
      this.currentStyle = await this.loadStyleFromJSON(this.currentVoice); 
      // Set isActive flag 
      this.isActive = true;

    } catch (error) {
      console.error('Error loading models:', error);
    }
  }

  /*
   * Write WAV file to ArrayBuffer
   */
  writeWavFile(audioData, sampleRate) {
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * bitsPerSample / 8;
    const blockAlign = numChannels * bitsPerSample / 8;
    const dataSize = audioData.length * 2;
    
    // Create ArrayBuffer
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);
    
    // Write WAV header
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);
    
    // Write audio data
    const int16Data = new Int16Array(audioData.length);
    for (let i = 0; i < audioData.length; i++) {
      const clamped = Math.max(-1.0, Math.min(1.0, audioData[i]));
      int16Data[i] = Math.floor(clamped * 32767);
    }
    
    const dataView = new Uint8Array(buffer, 44);
    dataView.set(new Uint8Array(int16Data.buffer));
    
    return buffer;
  }

  /* 
   * Main synthesis function
   */
  async generateSpeech(text, lang, totalStep=5, speed=1.05) {
    text = text.trim();

    if (!this.ttsProcessor || !this.cfgs) {
      console.error('Models are still loading. Please wait.');
      return;
    }
    
    if (!this.currentStyle) {
      console.error('Voice style is not ready. Please wait.');
      return;
    }
    
    try {
        const { wav, duration } = await this.ttsProcessor.call(
          text,
          lang,
          this.currentStyle, 
          totalStep,
          speed,
          0.3,
          (step, total) => {
            //
          }
        );
        const wavLen = Math.floor(this.ttsProcessor.sampleRate * duration[0]);
        const wavOut = wav.slice(0, wavLen);
        // Create WAV file
        const wavBuffer = this.writeWavFile(wavOut, this.ttsProcessor.sampleRate);
        const blob = new Blob([wavBuffer], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        return url;

    } catch (error) {
        console.error('Error during synthesis:', error);
    }
  }


  /*
   * Helper function to extract filename from path
   */
  _getFilenameFromPath(path) {
    return path.split('/').pop();
  }

}

export {TextToSpeech};
