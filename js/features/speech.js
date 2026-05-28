export function createSpeech({ micBtn, userInput, assistantSvg, showToast }) {
  let ttsEnabled = false;
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;

  function waitForVoices() {
    return new Promise((resolve) => {
      if (window.speechSynthesis.getVoices().length > 0) resolve();
      else window.speechSynthesis.onvoiceschanged = () => resolve();
    });
  }

  async function speakText(text) {
    if (!ttsEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[\*\_\`\#]/g, '').replace(/<[^>]*>?/gm, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'tr-TR';
    utterance.rate = 1.05;
    utterance.pitch = 0.85;
    await waitForVoices();
    const voices = window.speechSynthesis.getVoices();
    const trVoice =
      voices.find((v) => v.lang.includes('tr') && v.name.toLowerCase().includes('male')) ||
      voices.find((v) => v.lang.includes('tr'));
    if (trVoice) utterance.voice = trVoice;
    utterance.onstart = () => assistantSvg?.classList.add('speaking');
    utterance.onend = () => assistantSvg?.classList.remove('speaking');
    utterance.onerror = () => assistantSvg?.classList.remove('speaking');
    window.speechSynthesis.speak(utterance);
  }

  function initMic() {
    if (!Recognition || !micBtn) {
      if (micBtn) micBtn.style.display = 'none';
      return;
    }
    recognition = new Recognition();
    recognition.lang = 'tr-TR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      micBtn.classList.add('listening');
      assistantSvg?.classList.add('listening-active');
      userInput.placeholder = 'Dinliyorum ede...';
    };
    recognition.onresult = (event) => {
      const speechToText = event.results[0][0].transcript;
      userInput.value = `${userInput.value} ${speechToText}`.trim();
      userInput.dispatchEvent(new Event('input'));
    };
    recognition.onerror = () => showToast('Ses anlaşılamadı ede.');
    recognition.onend = () => {
      micBtn.classList.remove('listening');
      assistantSvg?.classList.remove('listening-active');
      userInput.placeholder = 'Yaz hele yiğidim...';
    };

    micBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (micBtn.classList.contains('listening')) recognition.stop();
      else recognition.start();
    });
  }

  function bindTts(ttsBtn) {
    ttsBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      ttsEnabled = !ttsEnabled;
      ttsBtn.classList.toggle('active', ttsEnabled);
      if (ttsEnabled) {
        showToast('Sesli okuma açıldı kardaşım');
        speakText('Dinliyorum kardaşım.');
      } else {
        showToast('Sesli okuma kapatıldı');
        window.speechSynthesis?.cancel();
        assistantSvg?.classList.remove('speaking');
      }
    });
  }

  initMic();
  return { speakText, bindTts };
}
