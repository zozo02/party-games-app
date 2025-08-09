import * as Speech from 'expo-speech';
export function say(text) {
  Speech.speak(text, { language: 'fr-FR', rate: 0.95 });
}
