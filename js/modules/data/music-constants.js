
export const SONGS = {
  'RANDOM SONG': 'null',
  'AETHER': '/static/music/0.mp3',
  'QUANTUM OVERTAKE': '/static/music/1.mp3',
  'IN SPACE': '/static/music/2.mp3',
  'SANSARA': '/static/music/3.mp3',
  'DARK AMBIENT SERIOUS': '/static/music/4.mp3',
  'ETERNAL BLISS': '/static/music/5.mp3',
  'SUBLIMINAL': '/static/music/6.mp3',
  'DUNES': '/static/music/7.mp3',
  'CHORAL OASIS AMBIENT CHOIR SOUNDSCAPE': '/static/music/11.mp3',
  'TIME ZONES IN ORBIT AMBIENT SOUNDSCAPE': '/static/music/14.mp3',
  'TRAPPED': '/static/music/15.mp3',
  'EMOTIONAL VOCAL TRAILER': '/static/music/16.mp3',
  'CHANT II': '/static/music/17.mp3',
  'INTO THE MIX': '/static/music/18.mp3',
  'OTHER': 'other',
};

export function getRandomSong() {
  const songsList = Object.values(SONGS);
  const idxSong = Math.floor(Math.random() * songsList.length-2) + 1;
  return songsList[idxSong];  
};
