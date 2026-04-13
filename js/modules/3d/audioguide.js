import {
  AudioListener,
  Audio,
  AudioLoader
} from 'three';


class AudioGuide extends AudioListener {

  /*
   * Constants
   */

  // Music
  static DEFAULT_AUDIO_VOLUME = 1.0;

  // Supported languages
  static SUPPORTED_LANGS = [
    'en',
    'fr'
  ];


  /*
   * Attributes
   */

  world3d = null;
  #audio = null;
  #audioVolume = null;
  #audioLoader = new AudioLoader();
  

  /*
   * Constructor
   */
  constructor(world3d) {
    super();
    this.world3d = world3d;

    this.#audio = new Audio(this);
    this.#audioVolume = AudioGuide.DEFAULT_AUDIO_VOLUME;
    this.setMasterVolume(1.0);
  }

  /*
   * Load an audiofile
   */
  async loadAudio(filepath, callback) {
    this.#audioLoader.load(filepath, buffer => {
      this.#audio.setBuffer(buffer);
      this.#audio.setLoop(false);
      this.#audio.duration = undefined;
      this.#audio.setVolume(this.#audioVolume);
      this.#audio.play();
    },
      xhr => {
        console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        console.log('loaded ' + filepath);
      },
      err => {
        console.log('A problem was met while loading an audio file');
      }
    );

    this.#audio.onEnded = () => {
      this.stop(callback);
    };
  }

  /*
   * Stops the Audio 
   */
  stop(callback) {
    this.#audio.stop();
    if (callback != null) {
      callback();
    }
  }

  /*
   * Set volume
   */
  setVolume(level) {
    if (this.#audio) {
      this.#audioVolume = level;
      this.#audio.setVolume(level);
    }
  }

  /*
   * Dispose 
   */
  dispose() {
    this.#audio.stop();
    // Resets the references to others objects
    this.#audio = null;
    this.#audioLoader = null;
  }

}

export { AudioGuide };
