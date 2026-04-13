import { TextToSpeech } from '/js/modules/tts/text-to-speech.js';


const TOTAL_STEPS = 16;
const SPEED = 1.05;

let tts = null;

const audioguideGenerator = {

  initPage: () => {
    // Sets the event handlers

    // Buttons
    document.querySelector('#generate-btn').addEventListener(
      'click', () => { audioguideGenerator.generate(); }
    );

    tts = new TextToSpeech();
  },

  // Generate audio files for the guided tour
  // and update content of json file
  generate: async () => {
    const basepath = document.querySelector('#basepath-text').value;
    const lang = document.querySelector('#lang-select').value;
    const voiceLevel = document.querySelector('#voice-level-text').value;
    const musicLevel = document.querySelector('#music-level-text').value;
    const speaker = document.querySelector('#speaker-select').value;
    // Initializes the TextToSpeech component
    await audioguideGenerator.trace('Initializing text to speech models');
    await tts.initializeModels();
    // Loads selected voice if needed
    if (speaker != tts.currentVoice) {
      await audioguideGenerator.trace('Loading selected voice');
      tts.currentStyle = await tts.loadStyleFromJSON(speaker); 
    }
    // Parses the JSON content
    await audioguideGenerator.trace('Parsing Guided Tour');
    const jsonPayload = document.querySelector('#tour-text').value;
    const tourDescriptor = JSON.parse(jsonPayload);
    // Iterates over stages
    for (let i=0; i < tourDescriptor['stages'].length; i++ ) {
      await audioguideGenerator.trace(`Generating audio version of stage ${i}`);
      const filename = `audio_stage_${i}.wav`;
      // Generates audio wav
      const text = tourDescriptor['stages'][i]['desc'];
      const url = await tts.generateSpeech(
        text,
        lang,
        TOTAL_STEPS,
        SPEED
      );
      // Saves on disk
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
      // Adds audiofile attribute to JSON
      tourDescriptor['lang'] = lang;
      tourDescriptor['voice_level'] = voiceLevel;
      tourDescriptor['music_level'] = musicLevel;
      tourDescriptor['stages'][i]['audiofile'] = `${basepath}/${filename}`;
    }
    
    // Updated tour object to JSON
    const jsonResult = JSON.stringify(tourDescriptor, null, 2);
    // Displays the updated JSON
    document.querySelector('#result-text').value = jsonResult;
  },

  sleep: async (time) => {
    return new Promise((resolve) => setTimeout(resolve, time));
  },

  trace: async (msg) => {
    document.querySelector('#result-text').value += `${msg}\n`;
    await audioguideGenerator.sleep(500);
  },

};

// Inits the page
audioguideGenerator.initPage();