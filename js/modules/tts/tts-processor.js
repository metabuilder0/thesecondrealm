import * as ort from '/js/libs/onnx/ort.all.bundle.min.mjs';

class TTSProcessor {

  /*
   * Attributes
   */
  
  cfgs = null;
  textProcessor = null;
  dpOrt = null;
  textEncOrt = null;
  vectorEstOrt = null;
  vocoderOrt = null;
  sampleRate = null;


  /*
   * Constructor
   */
  constructor(
    cfgs,
    textProcessor,
    dpOrt,
    textEncOrt,
    vectorEstOrt,
    vocoderOrt
  ) {

    this.cfgs = cfgs;
    this.textProcessor = textProcessor;
    this.dpOrt = dpOrt;
    this.textEncOrt = textEncOrt;
    this.vectorEstOrt = vectorEstOrt;
    this.vocoderOrt = vocoderOrt;
    this.sampleRate = cfgs.ae.sample_rate;
  }

  /*
   * Speech generation
   */
  async _infer(
    textList,
    langList,
    style,
    totalStep,
    speed=1.05,
    progressCallback=null
  ) {

    const bsz = textList.length;
    
    // Process text
    const { textIds, textMask } = this.textProcessor.call(textList, langList);
    
    const textIdsFlat = new BigInt64Array(textIds.flat().map(x => BigInt(x)));
    const textIdsShape = [bsz, textIds[0].length];
    const textIdsTensor = new ort.Tensor('int64', textIdsFlat, textIdsShape);
    
    const textMaskFlat = new Float32Array(textMask.flat(2));
    const textMaskShape = [bsz, 1, textMask[0][0].length];
    const textMaskTensor = new ort.Tensor('float32', textMaskFlat, textMaskShape);
    
    // Predict duration
    const dpOutputs = await this.dpOrt.run({
      text_ids: textIdsTensor,
      style_dp: style.dp,
      text_mask: textMaskTensor
    });
    const duration = Array.from(dpOutputs.duration.data);
    
    // Apply speed factor to duration
    for (let i = 0; i < duration.length; i++) {
      duration[i] /= speed;
    }
    
    // Encode text
    const textEncOutputs = await this.textEncOrt.run({
      text_ids: textIdsTensor,
      style_ttl: style.ttl,
      text_mask: textMaskTensor
    });
    const textEmb = textEncOutputs.text_emb;
    
    // Sample noisy latent
    let { xt, latentMask } = this.sampleNoisyLatent(
      duration,
      this.sampleRate,
      this.cfgs.ae.base_chunk_size,
      this.cfgs.ttl.chunk_compress_factor,
      this.cfgs.ttl.latent_dim
    );
    
    const latentMaskFlat = new Float32Array(latentMask.flat(2));
    const latentMaskShape = [bsz, 1, latentMask[0][0].length];
    const latentMaskTensor = new ort.Tensor('float32', latentMaskFlat, latentMaskShape);
    
    // Prepare constant arrays
    const totalStepArray = new Float32Array(bsz).fill(totalStep);
    const totalStepTensor = new ort.Tensor('float32', totalStepArray, [bsz]);
    
    // Denoising loop
    for (let step = 0; step < totalStep; step++) {
      if (progressCallback) {
        progressCallback(step + 1, totalStep);
      }
      
      const currentStepArray = new Float32Array(bsz).fill(step);
      const currentStepTensor = new ort.Tensor('float32', currentStepArray, [bsz]);
      
      const xtFlat = new Float32Array(xt.flat(2));
      const xtShape = [bsz, xt[0].length, xt[0][0].length];
      const xtTensor = new ort.Tensor('float32', xtFlat, xtShape);
      
      const vectorEstOutputs = await this.vectorEstOrt.run({
        noisy_latent: xtTensor,
        text_emb: textEmb,
        style_ttl: style.ttl,
        latent_mask: latentMaskTensor,
        text_mask: textMaskTensor,
        current_step: currentStepTensor,
        total_step: totalStepTensor
      });
      
      const denoised = Array.from(vectorEstOutputs.denoised_latent.data);
      
      // Reshape to 3D
      const latentDim = xt[0].length;
      const latentLen = xt[0][0].length;
      xt = [];
      let idx = 0;
      for (let b = 0; b < bsz; b++) {
        const batch = [];
        for (let d = 0; d < latentDim; d++) {
          const row = [];
          for (let t = 0; t < latentLen; t++) {
            row.push(denoised[idx++]);
          }
          batch.push(row);
        }
        xt.push(batch);
      }
    }
    
    // Generate waveform
    const finalXtFlat = new Float32Array(xt.flat(2));
    const finalXtShape = [bsz, xt[0].length, xt[0][0].length];
    const finalXtTensor = new ort.Tensor('float32', finalXtFlat, finalXtShape);
    
    const vocoderOutputs = await this.vocoderOrt.run({
      latent: finalXtTensor
    });
    
    const wav = Array.from(vocoderOutputs.wav_tts.data);
    
    return { wav, duration };
  }

  /*
   * Chunk text into manageable segments
   */
  chunkText(text, maxLen = 300) {
    if (typeof text !== 'string') {
      throw new Error(`chunkText expects a string, got ${typeof text}`);
    }
    
    // Split by paragraph (two or more newlines)
    const paragraphs = text.trim().split(/\n\s*\n+/).filter(p => p.trim());
    const chunks = [];
    for (let paragraph of paragraphs) {
      paragraph = paragraph.trim();
      if (!paragraph) continue;
      // Split by sentence boundaries (period, question mark, exclamation mark followed by space)
      // But exclude common abbreviations like Mr., Mrs., Dr., etc. and single capital letters like F.
      const sentences = paragraph.split(/(?<!Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.|Sr\.|Jr\.|Ph\.D\.|etc\.|e\.g\.|i\.e\.|vs\.|Inc\.|Ltd\.|Co\.|Corp\.|St\.|Ave\.|Blvd\.)(?<!\b[A-Z]\.)(?<=[.!?])\s+/);
      let currentChunk = '';
      for (let sentence of sentences) {
        if (currentChunk.length + sentence.length + 1 <= maxLen) {
          currentChunk += (currentChunk ? ' ' : '') + sentence;
        } else {
          if (currentChunk) {
            chunks.push(currentChunk.trim());
          }
          currentChunk = sentence;
        }
      }
      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }
    }
    return chunks;
  }

  /*
   * Processing of a single text
   */
  async call(
    text,
    lang,
    style,
    totalStep,
    speed=1.05,
    silenceDuration=0.3,
    progressCallback=null
  ) {

    if (style.ttl.dims[0] !== 1) {
      throw new Error('Single speaker text to speech only supports single style');
    }
    const maxLen = lang === 'ko' ? 120 : 300;
    const textList = this.chunkText(text, maxLen);
    const langList = new Array(textList.length).fill(lang);
    let wavCat = [];
    let durCat = 0;
    
    for (let i = 0; i < textList.length; i++) {
      const { wav, duration } = await this._infer(
        [textList[i]], 
        [langList[i]], 
        style, 
        totalStep, 
        speed, 
        progressCallback
      );
      
      if (wavCat.length === 0) {
        wavCat = wav;
        durCat = duration[0];
      } else {
        const silenceLen = Math.floor(silenceDuration * this.sampleRate);
        const silence = new Array(silenceLen).fill(0);
        wavCat = [...wavCat, ...silence, ...wav];
        durCat += duration[0] + silenceDuration;
      }
    }
    
    return { wav: wavCat, duration: [durCat] };
  }

  /*
  * Processing of a list of texts
  */
  async batch(
    textList,
    langList, 
    style,
    totalStep,
    speed=1.05,
    progressCallback=null
  ) {
    return await this._infer(textList, langList, style, totalStep, speed, progressCallback);
  }

  /*
   *
   */
  sampleNoisyLatent(
    duration, 
    sampleRate, 
    baseChunkSize, 
    chunkCompress, 
    latentDim
  ) {

    const bsz = duration.length;
    const maxDur = Math.max(...duration);
    
    const wavLenMax = Math.floor(maxDur * sampleRate);
    const wavLengths = duration.map(d => Math.floor(d * sampleRate));
    
    const chunkSize = baseChunkSize * chunkCompress;
    const latentLen = Math.floor((wavLenMax + chunkSize - 1) / chunkSize);
    const latentDimVal = latentDim * chunkCompress;
    
    const xt = [];
    for (let b = 0; b < bsz; b++) {
      const batch = [];
      for (let d = 0; d < latentDimVal; d++) {
        const row = [];
        for (let t = 0; t < latentLen; t++) {
          // Box-Muller transform
          const u1 = Math.max(0.0001, Math.random());
          const u2 = Math.random();
          const val = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
          row.push(val);
        }
        batch.push(row);
      }
      xt.push(batch);
    }
    
    const latentLengths = wavLengths.map(len => Math.floor((len + chunkSize - 1) / chunkSize));
    const latentMask = this.lengthToMask(latentLengths, latentLen);
    
    // Apply mask
    for (let b = 0; b < bsz; b++) {
      for (let d = 0; d < latentDimVal; d++) {
        for (let t = 0; t < latentLen; t++) {
          xt[b][d][t] *= latentMask[b][0][t];
        }
      }
    }
    
    return { xt, latentMask };
  }

  /*
   *
   */
  lengthToMask(lengths, maxLen=null) {
    const actualMaxLen = maxLen || Math.max(...lengths);
    return lengths.map(len => {
      const row = new Array(actualMaxLen).fill(0.0);
      for (let j = 0; j < Math.min(len, actualMaxLen); j++) {
        row[j] = 1.0;
      }
      return [row];
    });
  }

}

export { TTSProcessor };
