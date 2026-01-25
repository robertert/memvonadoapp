import { Audio } from 'expo-av';

// 1. MAPA DŹWIĘKÓW
// Tutaj importujesz wszystkie swoje pliki.
// WAŻNE: Używaj mp3/m4a dla kompatybilności z iOS (ogg działa tylko na Android).
const SOUND_FILES = {
  combo: require('../assets/sounds/combo.mp3'),
  good: require('../assets/sounds/good.mp3'),
  wrong: require('../assets/sounds/wrong.mp3'),
  hard: require('../assets/sounds/hard.mp3'),
  easy: require('../assets/sounds/easy.mp3'),
  victory: require('../assets/sounds/victory.mp3'),
  click: require('../assets/sounds/click.mp3'),
};

// Typ pomocniczy, żeby VS Code podpowiadał Ci nazwy (np. 'combo' | 'success')
export type SoundName = keyof typeof SOUND_FILES;

// 2. KONFIGURACJA AUDIO (Opcjonalne, ale zalecane)
// Dzięki temu dźwięk zagra nawet jak iPhone ma przełącznik "Silent" włączony.
const configureAudioSession = async () => {
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true, // ścisza muzykę w tle (np. Spotify) gdy gra Twój dźwięk
    });
  } catch (e) {
    console.warn('Nie udało się skonfigurować sesji audio', e);
  }
};

configureAudioSession();


export async function playSound(name: SoundName) {
  try {
    const source = SOUND_FILES[name];

    // Tworzymy i ładujemy obiekt dźwięku
    const { sound } = await Audio.Sound.createAsync(
      source,
      { shouldPlay: true } // Od razu odtwarzaj po załadowaniu
    );

    // Nasłuchujemy, kiedy skończy grać, żeby posprzątać pamięć
    sound.setOnPlaybackStatusUpdate(async (status) => {
      if (status.isLoaded && status.didJustFinish) {
        // Zwalniamy zasoby
        await sound.unloadAsync();
      }
    });

  } catch (error) {
    console.error(`Błąd podczas odtwarzania dźwięku "${name}":`, error);
  }
}