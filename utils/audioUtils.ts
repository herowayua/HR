// --- Утиліти для кодування та декодування аудіо ---

// Ці функції є критично важливими для обробки необроблених аудіоданих PCM з Gemini API.
// Ми повинні реалізувати їх вручну, оскільки стандартні API браузера не підтримують цей формат напряму.

// Декодування Base64
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Кодування Base64
function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Декодування необроблених аудіоданих PCM в AudioBuffer для відтворення
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}


// --- Черга відтворення аудіо для Live API ---
// Використання патерну, схожого на сінглтон, для управління єдиним AudioContext та чергою відтворення.

let outputAudioContext: AudioContext | null = null;
let nextStartTime = 0;
const sources = new Set<AudioBufferSourceNode>();

function getOutputAudioContext(): AudioContext {
    if (!outputAudioContext || outputAudioContext.state === 'closed') {
        outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        nextStartTime = 0;
        sources.clear();
    }
    return outputAudioContext;
}

async function playAudio(base64EncodedAudioString: string) {
    const ctx = getOutputAudioContext();
    const audioData = decode(base64EncodedAudioString);
    const audioBuffer = await decodeAudioData(audioData, ctx, 24000, 1);
    
    // Забезпечуємо безперервне відтворення, плануючи наступний фрагмент одразу після попереднього
    nextStartTime = Math.max(nextStartTime, ctx.currentTime);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    
    source.addEventListener('ended', () => {
        sources.delete(source);
    });
    
    source.start(nextStartTime);
    nextStartTime += audioBuffer.duration;
    sources.add(source);
}

function createBlob(data: Float32Array) {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

function cleanup() {
    if (outputAudioContext && outputAudioContext.state !== 'closed') {
        outputAudioContext.close();
    }
    outputAudioContext = null;
    sources.forEach(source => source.stop());
    sources.clear();
}

export const audioUtils = {
    playAudio,
    createBlob,
    cleanup
};
