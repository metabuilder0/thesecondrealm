import {
  AudioListener,
  Audio,
  AudioLoader
} from 'three';

class SoundSystem extends AudioListener{

  /**
   * Constants 
   */

  // URIs
  static URI_INTRO = '/static/sounds/riser-aggressive.mp3';

  // Music
  static DEFAULT_MUSIC_VOLUME = 0.5;
  static DEFAULT_INTRO_VOLUME = 1.0;


  /*
   * Attributes 
   */

  #music = null;
  #audioLoader = new AudioLoader();
  #musicVolume = null;
  #introVolume = null;


  /*
   * Constructor
   */
  constructor() {
    super();
    this.#music = new Audio(this);
    this.#musicVolume = SoundSystem.DEFAULT_MUSIC_VOLUME;
    this.#introVolume = SoundSystem.DEFAULT_INTRO_VOLUME;
    this.setMasterVolume(1.0);
  }

  /*
   * Play intro cinematic
   */
  async playIntro(callback) {
    this.#audioLoader.load(SoundSystem.URI_INTRO, buffer => {
      this.#music.setBuffer(buffer);
      this.#music.setLoop(false);
      this.#music.duration = 23.5;
      this.#music.setVolume(this.#introVolume);
      this.#music.play();
    },
      xhr => {
        console.log((xhr.loaded / xhr.total * 100) + '% loaded');
      },
      err => {
        console.log('A problem was met while loading an audio file');
      }
    );
    this.#music.onEnded = () => {
      this.#music.stop();
      if (callback != null) {
        callback();
      }
    };
  }

  /*
   * Load a song
   */
  async loadMusic(filepath) {
    this.#audioLoader.load(filepath, buffer => {
      this.#music.setBuffer(buffer);
      this.#music.setLoop(true);
      this.#music.duration = undefined;
      this.#music.setVolume(this.#musicVolume);
      this.#music.play();
    },
      xhr => {
        console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        console.log('loaded ' + filepath);
      },
      err => {
        console.log('A problem was met while loading an audio file');
      }
    );
  }
  
  /*
   * Set volume
   */
  setVolume(level) {
    if (this.#music) {
      this.#musicVolume = level;
      this.#music.setVolume(level);
    }
  }

  /*
   * Stops the SoundSystem 
   */
  stop() {
    this.#music.stop();
  }

  /*
   * Dispose the camera 
   */
  dispose() {
    // Resets the references to others objects
    this.#music = null;
    this.#audioLoader = null;
  }

}

export { SoundSystem };
