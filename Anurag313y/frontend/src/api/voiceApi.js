import api from './axios';

export const voiceTranscribe = async (audioBlob, filename = 'voice.webm') => {
  const form = new FormData();
  form.append('audio', audioBlob, filename);
  const { data } = await api.post('/voice/transcribe', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

export const voiceExtract = async (transcript) => {
  const { data } = await api.post('/voice/extract', { transcript });
  return data;
};

