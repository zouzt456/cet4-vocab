export function useSpeech() {
  function speak(t: string) {
    try {
      const u = new SpeechSynthesisUtterance(t);
      u.lang = "en-US";
      u.rate = 0.9;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch {
      /* 无语音合成的环境直接忽略 */
    }
  }
  return { speak };
}
