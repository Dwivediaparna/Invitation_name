'use client';

import { useState, useRef, useEffect } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { GoogleGenAI } from '@google/genai';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Loader2, Video, Download, Sparkles, Image as ImageIcon, AlertTriangle, KeyRound, Check } from 'lucide-react';

// Build-time env var (set via GitHub Secrets during CI/CD)
const BUILD_TIME_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';

export default function Home() {
  const [name, setName] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [mergeVideo, setMergeVideo] = useState(false);
  const [bgStyle, setBgStyle] = useState('no_ai_card');
  const [aiPrompt, setAiPrompt] = useState('');
  const [invitationText, setInvitationText] = useState('You are cordially invited');
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [isGeneratingBg, setIsGeneratingBg] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState(BUILD_TIME_API_KEY);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const ffmpegRef = useRef<any>(null);

  const loadFFmpeg = async () => {
    if (!ffmpegRef.current) {
      ffmpegRef.current = new FFmpeg();
    }
    const ffmpeg = ffmpegRef.current;
    ffmpeg.on('progress', ({ progress }: any) => {
      setProgress(Math.round(progress * 100));
    });
    ffmpeg.on('log', ({ message }: any) => {
      console.log(message);
    });
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    try {
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      setIsReady(true);
    } catch (e) {
      console.error("Failed to load FFmpeg", e);
      setStatusText("Failed to load video processor.");
    }
  };

  useEffect(() => {
    loadFFmpeg();
    // Load API key from localStorage (runtime fallback)
    const storedKey = localStorage.getItem('gemini_api_key');
    if (storedKey) {
      setGeminiApiKey(storedKey);
    } else if (!BUILD_TIME_API_KEY) {
      setShowApiKeyInput(true);
    }
  }, []);

  const saveApiKey = () => {
    if (apiKeyInput.trim()) {
      const key = apiKeyInput.trim();
      localStorage.setItem('gemini_api_key', key);
      setGeminiApiKey(key);
      setShowApiKeyInput(false);
      setApiKeyInput('');
    }
  };

  const clearApiKey = () => {
    localStorage.removeItem('gemini_api_key');
    setGeminiApiKey(BUILD_TIME_API_KEY);
    setShowApiKeyInput(true);
  };

  const hasApiKey = geminiApiKey.length > 0;

  useEffect(() => {
    if (bgStyle === 'card_photo' || bgStyle === 'no_ai_card') {
      setInvitationText('अपर्णा 🥁 दीपक');
    } else if (bgStyle === 'royal' || bgStyle === 'no_ai_royal') {
      setInvitationText('You are invited to the\nRoyal Wedding');
    } else {
      setInvitationText('You are cordially invited');
    }
  }, [bgStyle]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setVideoFile(e.target.files[0]);
      setResultUrl(null);
    }
  };

  const extractFrame = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.src = URL.createObjectURL(file);
      video.crossOrigin = 'anonymous';
      video.currentTime = 1; // 1 second in
      video.onloadeddata = () => {
        video.onseeked = () => {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
      };
      video.onerror = reject;
    });
  };

  const fetchAiBackground = async (retryCount = 0): Promise<string | null> => {
    if (!geminiApiKey) {
      setStatusText('⚠️ No Gemini API key configured. Please add your key above.');
      setShowApiKeyInput(true);
      return null;
    }
    try {
      const ai = new GoogleGenAI({ apiKey: geminiApiKey });
      let finalPrompt = aiPrompt;

      if (bgStyle === 'traditional') {
        finalPrompt = 'A beautiful traditional Indian wedding invitation background, ornate gold borders, floral garlands, marigold flowers, subtle peacock motifs, warm cream and gold colors, empty center for text, portrait orientation.';
      } else if (bgStyle === 'modern') {
        finalPrompt = 'A modern minimalist elegant invitation background, soft pastel colors, subtle geometric gold lines, clean and sophisticated, empty center for text, portrait orientation.';
      } else if (bgStyle === 'floral') {
        finalPrompt = 'A romantic floral invitation background, watercolor roses and peonies, soft blush pink and sage green, elegant gold accents, empty center for text, portrait orientation.';
      } else if (bgStyle === 'royal') {
        finalPrompt = 'A royal Rajput style palace invitation background, intricate arches, deep maroon and rich gold colors, majestic and luxurious, empty center for text, portrait orientation.';
      } else if (bgStyle === 'card_photo') {
        finalPrompt = 'A blank traditional Indian wedding invitation card background. Golden yellow textured paper. Top center has a beautiful traditional Indian elephant motif (Ganesha) in red and gold, surrounded by auspicious wedding symbols. The entire bottom half and center MUST be completely empty golden yellow paper with NO text and NO objects. Portrait orientation, clean, highly detailed.';
      } else if (bgStyle === 'match' && videoFile) {
        setStatusText('Analyzing video style...');
        const frameDataUrl = await extractFrame(videoFile);
        const base64Data = frameDataUrl.split(',')[1];

        const visionResponse = await ai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: {
            parts: [
              { inlineData: { data: base64Data, mimeType: 'image/jpeg' } },
              { text: 'Analyze this invitation frame and describe its background in detail. Specifically identify the dominant colors (use specific color names), subtle textures (e.g., watercolor, marble, matte paper, metallic, grain), and any recurring motifs or patterns. Keep it under 60 words.' }
            ]
          }
        });
        const styleDescription = visionResponse.text;
        finalPrompt = `A blank invitation background matching this exact style: ${styleDescription}. It MUST feature the exact same dominant colors and subtle textures described. The center MUST be completely empty for text. Portrait orientation, high quality, seamless design.`;
        setStatusText('Generating matching background...');
      }


      if (!finalPrompt) return null;

      // Use gemini-3.1-flash-image-preview (Nano Banana 2) for image generation
      // Official docs: https://ai.google.dev/gemini-api/docs/image-generation
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents: `Generate an image: ${finalPrompt}. The image must be in portrait 9:16 aspect ratio.`,
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const base64EncodeString = part.inlineData.data;
          const mimeType = part.inlineData.mimeType || 'image/png';
          return `data:${mimeType};base64,${base64EncodeString}`;
        }
      }
      throw new Error("No image data found in AI response");
    } catch (error: any) {
      console.error('Error generating background:', error);

      // Check for rate-limit / quota-exceeded errors (HTTP 429)
      const errorMsg = error?.message || error?.toString() || '';
      if (errorMsg.includes('429') || errorMsg.includes('RESOURCE_EXHAUSTED') || errorMsg.includes('quota')) {
        setStatusText('⚠️ API quota exceeded. Please wait a minute and try again, or use a different API key.');
        return null; // Don't retry on quota errors — it won't help
      }

      if (retryCount < 2) {
        setStatusText(`Retrying background generation... (${retryCount + 1}/2)`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return fetchAiBackground(retryCount + 1);
      }
    }
    return null;
  };

  const generateBackground = async () => {
    setIsGeneratingBg(true);
    setStatusText('Generating AI background...');
    const url = await fetchAiBackground();
    if (url) {
      setBgImage(url);
      setStatusText('');
    } else {
      setStatusText('Failed to generate AI background.');
    }
    setIsGeneratingBg(false);
  };

  const drawFrame = async (canvas: HTMLCanvasElement, name: string, width: number, height: number, bgImageUrl: string | null) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    canvas.width = width;
    canvas.height = height;

    if (bgImageUrl) {
      const img = new Image();
      if (!bgImageUrl.startsWith('data:')) {
        img.crossOrigin = "anonymous";
      }
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error("Failed to load background image"));
        img.src = bgImageUrl;
      });
      ctx.drawImage(img, 0, 0, width, height);

      const scale = width / 1080;

      if (bgStyle !== 'card_photo') {
        // Elegant overlay for text readability
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(width * 0.1, height * 0.35, width * 0.8, height * 0.3, 40 * scale);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(212, 175, 55, 0.8)'; // Gold
        ctx.lineWidth = 4 * scale;
        ctx.stroke();
        ctx.restore();
      }
    } else {
      // Fallback Background
      const scale = width / 1080;

      if (bgStyle === 'card_photo' || bgStyle === 'no_ai_card') {
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, '#E8B851'); // Golden yellow
        gradient.addColorStop(1, '#D49A36'); // Darker yellow
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // Faint mandala/circle at the top to represent where Ganesha goes
        ctx.beginPath();
        ctx.arc(width / 2, height * 0.28, 250 * scale, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(122, 23, 18, 0.15)'; // Faint maroon
        ctx.lineWidth = 5 * scale;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(width / 2, height * 0.28, 230 * scale, 0, Math.PI * 2);
        ctx.lineWidth = 2 * scale;
        ctx.stroke();

        try {
          const ganeshaImg = new window.Image();
          ganeshaImg.crossOrigin = "anonymous";
          ganeshaImg.src = './ganesha.png';

          await new Promise((resolve, reject) => {
            ganeshaImg.onload = resolve;
            ganeshaImg.onerror = () => resolve(false); // Fallback gracefully if image is missing
          });

          if (ganeshaImg.width > 0) {
            ctx.save();
            ctx.globalCompositeOperation = 'multiply';
            // The image has a white background, multiply will remove white and keep the dark red lines
            const imgSize = 400 * scale;
            const imgX = (width / 2) - (imgSize / 2);
            const imgY = (height * 0.28) - (imgSize / 2);
            ctx.drawImage(ganeshaImg, imgX, imgY, imgSize, imgSize);
            ctx.restore();
          }
        } catch (e) {
          console.error("Failed to load Ganesha idol image", e);
        }
      } else if (bgStyle === 'no_ai_royal') {
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, '#510f13'); // Deep maroon
        gradient.addColorStop(1, '#2c0505');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        ctx.strokeStyle = '#d4af37'; // Gold
        ctx.lineWidth = 20 * scale;
        ctx.strokeRect(40 * scale, 40 * scale, width - 80 * scale, height - 80 * scale);
        ctx.lineWidth = 4 * scale;
        ctx.strokeRect(70 * scale, 70 * scale, width - 140 * scale, height - 140 * scale);
      } else if (bgStyle === 'no_ai_modern') {
        const gradient = ctx.createLinearGradient(width, 0, 0, height);
        gradient.addColorStop(0, '#fdf2f8'); // Pink 50
        gradient.addColorStop(1, '#fbcfe8'); // Pink 200
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        ctx.strokeStyle = '#f472b6'; // dark pink
        ctx.lineWidth = 6 * scale;
        ctx.strokeRect(60 * scale, 60 * scale, width - 120 * scale, height - 120 * scale);
      } else {
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, '#fff8e7'); // Warm cream
        gradient.addColorStop(1, '#fdf5e6');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // Border
        ctx.strokeStyle = '#d4af37'; // Gold
        ctx.lineWidth = 20 * scale;
        ctx.strokeRect(40 * scale, 40 * scale, width - 80 * scale, height - 80 * scale);
        ctx.lineWidth = 5 * scale;
        ctx.strokeRect(55 * scale, 55 * scale, width - 110 * scale, height - 110 * scale);
      }
    }

    const scale = width / 1080;

    // Ensure Hindi font is loaded
    await document.fonts.load(`10px "Noto Serif Devanagari"`);
    await document.fonts.load(`500 10px "Noto Serif Devanagari"`);
    await document.fonts.load(`600 10px "Noto Serif Devanagari"`);
    await document.fonts.load(`700 10px "Noto Serif Devanagari"`);

    // Text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (bgStyle === 'card_photo' || bgStyle === 'no_ai_card') {
      ctx.fillStyle = '#7A1712'; // Dark maroon
      ctx.textAlign = 'center';

      // 1. ।। श्री गणपतये नमः ।।
      ctx.font = `500 ${35 * scale}px "Noto Serif Devanagari", serif`;
      (ctx as any).letterSpacing = `${2 * scale}px`;
      ctx.fillText("।। श्री गणपतये नमः ।।", width / 2, height * 0.55);

      // 2. Names
      ctx.font = `700 ${80 * scale}px "Noto Serif Devanagari", serif`;
      (ctx as any).letterSpacing = `${4 * scale}px`;
      const namesText = invitationText || "अपर्णा 🥁 दीपक";
      ctx.fillText(namesText, width / 2, height * 0.62);

      // 3. शुभविवाह
      ctx.font = `700 ${95 * scale}px "Noto Serif Devanagari", serif`;
      (ctx as any).letterSpacing = `${6 * scale}px`;
      ctx.fillText("शुभविवाह", width / 2, height * 0.69);

      // 4. प्रतिष्ठा में,
      ctx.font = `500 ${40 * scale}px "Noto Serif Devanagari", serif`;
      (ctx as any).letterSpacing = `${2 * scale}px`;
      ctx.fillText("प्रतिष्ठा में,", width / 2, height * 0.78);

      // 5. श्रीयुत् [Name]
      ctx.font = `700 ${65 * scale}px "Noto Serif Devanagari", serif`;
      (ctx as any).letterSpacing = `${3 * scale}px`;
      const guestText = `श्रीयुत्   ${name}`; // Added space after shree yut
      ctx.fillText(guestText, width / 2, height * 0.84);

      // 6. Line under name
      const textWidth = ctx.measureText(guestText).width;
      ctx.beginPath();
      ctx.moveTo(width / 2 - textWidth / 2, height * 0.86);
      ctx.lineTo(width / 2 + textWidth / 2, height * 0.86);
      ctx.strokeStyle = '#7A1712';
      ctx.lineWidth = 3 * scale;
      ctx.stroke();

      (ctx as any).letterSpacing = '0px';
    } else {
      ctx.fillStyle = bgStyle === 'no_ai_royal' ? '#fdf5e6' : '#8b0000'; // Cream for royal, dark red otherwise
      ctx.font = `italic 600 ${60 * scale}px "Noto Serif Devanagari", Georgia, serif`;
      (ctx as any).letterSpacing = `${1 * scale}px`;

      const lines = invitationText.split('\n');
      let textY = height / 2 - 100 * scale;
      lines.forEach((line) => {
        ctx.fillText(line, width / 2, textY);
        textY += 70 * scale;
      });

      ctx.fillStyle = bgStyle === 'no_ai_royal' ? '#d4af37' : '#000000'; // Gold for royal, black otherwise
      ctx.font = `700 ${90 * scale}px "Noto Serif Devanagari", Arial, sans-serif`;
      (ctx as any).letterSpacing = `${2 * scale}px`;
      ctx.fillText(name, width / 2, textY + 30 * scale);

      (ctx as any).letterSpacing = '0px';
    }

    return canvas.toDataURL('image/png');
  };

  const processVideo = async () => {
    if (!name || !isReady || (mergeVideo && !videoFile)) return;
    setIsProcessing(true);
    setProgress(0);
    setStatusText('Preparing...');
    setResultUrl(null);

    try {
      const ffmpeg = ffmpegRef.current;

      let width = 1080;
      let height = 1920;

      if (videoFile) {
        setStatusText('Reading video properties...');
        const videoElement = document.createElement('video');
        videoElement.src = URL.createObjectURL(videoFile);
        await new Promise((resolve) => {
          videoElement.onloadedmetadata = resolve;
        });
        width = videoElement.videoWidth;
        height = videoElement.videoHeight;
      }

      const isAiMode = !bgStyle.startsWith('no_ai_');
      let currentBgImage = bgImage;
      if (isAiMode && !currentBgImage && (bgStyle !== 'custom' || aiPrompt)) {
        setStatusText('Generating AI background...');
        currentBgImage = await fetchAiBackground();
        if (currentBgImage) {
          setBgImage(currentBgImage);
        } else {
          setStatusText('Failed to generate AI background. Please try again or change the prompt.');
          setIsProcessing(false);
          return; // Stop processing if background generation fails
        }
      } else if (!isAiMode) {
        currentBgImage = null; // Always use local canvas drawing for no_ai modes
      }

      setStatusText('Generating intro frame...');
      const canvas = document.createElement('canvas');
      const dataUrl = await drawFrame(canvas, name, width, height, currentBgImage);
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const imageArrayBuffer = await blob.arrayBuffer();

      setStatusText('Writing files to memory...');
      await ffmpeg.writeFile('image.png', new Uint8Array(imageArrayBuffer));

      setStatusText('Creating silent audio...');
      await ffmpeg.exec([
        '-f', 'lavfi',
        '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
        '-t', '5',
        'silent.m4a'
      ]);

      setStatusText('Creating intro video...');
      await ffmpeg.exec([
        '-loop', '1',
        '-i', 'image.png',
        '-i', 'silent.m4a',
        '-c:v', 'libx264',
        '-t', '5',
        '-pix_fmt', 'yuv420p',
        '-vf', `scale=${width}:${height}`,
        '-c:a', 'aac',
        '-shortest',
        'intro.mp4'
      ]);

      let finalOutput = 'intro.mp4';

      if (mergeVideo && videoFile) {
        setStatusText('Writing original video to memory...');
        await ffmpeg.writeFile('input.mp4', await fetchFile(videoFile));

        setStatusText('Merging videos (fast mode)...');
        await ffmpeg.writeFile('concat.txt', "file 'intro.mp4'\nfile 'input.mp4'");
        await ffmpeg.exec([
          '-f', 'concat',
          '-safe', '0',
          '-i', 'concat.txt',
          '-c', 'copy',
          'output.mp4'
        ]);
        finalOutput = 'output.mp4';
      }

      setStatusText('Finalizing...');
      const data = await ffmpeg.readFile(finalOutput);
      const url = URL.createObjectURL(new Blob([data as any], { type: 'video/mp4' }));
      setResultUrl(url);
      setStatusText('Done!');
    } catch (error) {
      console.error('Error processing video:', error);
      setStatusText('An error occurred.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 p-4 md:p-8 font-sans">
      <span style={{ fontFamily: '"Noto Serif Devanagari"', visibility: 'hidden', position: 'absolute' }}>.</span>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-neutral-900">Invitation Personalizer</h1>
          <p className="text-neutral-500">Add a personalized 5-second intro frame to your invitation video.</p>
        </div>

        {/* API Key Configuration Banner */}
        {showApiKeyInput && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="font-medium text-amber-900">Gemini API Key Required</p>
                <p className="text-sm text-amber-700">
                  AI background generation requires a Google Gemini API key.
                  Get your free key at{' '}
                  <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="underline font-medium hover:text-amber-900">
                    aistudio.google.com/apikey
                  </a>
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <Input
                  type="password"
                  placeholder="Paste your Gemini API key here (AIza...)"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveApiKey()}
                  className="pl-9 bg-white"
                />
              </div>
              <Button onClick={saveApiKey} disabled={!apiKeyInput.trim()} size="default">
                <Check className="h-4 w-4 mr-1" />
                Save Key
              </Button>
            </div>
            <p className="text-xs text-amber-600">
              🔒 Your key is stored only in your browser&apos;s localStorage. It is never sent to any server other than Google&apos;s API.
            </p>
          </div>
        )}
        {hasApiKey && !showApiKeyInput && (
          <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-2">
            <div className="flex items-center gap-2 text-sm text-green-800">
              <Check className="h-4 w-4" />
              <span>Gemini API key configured {!BUILD_TIME_API_KEY && '(saved in browser)'}</span>
            </div>
            {!BUILD_TIME_API_KEY && (
              <Button variant="ghost" size="sm" onClick={clearApiKey} className="text-green-700 hover:text-red-600 text-xs h-7">
                Change Key
              </Button>
            )}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
              <CardDescription>Configure your personalized intro.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4 border-b pb-6">
                <div className="space-y-2">
                  <Label className="text-base">1. Generate AI Background</Label>
                  <p className="text-sm text-neutral-500">Choose a theme or match your original video.</p>

                  <Select value={bgStyle} onValueChange={(val) => { if (val) { setBgStyle(val); setBgImage(null); } }} disabled={isGeneratingBg || isProcessing}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a style" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Instant Backgrounds (No AI Needed)</SelectLabel>
                        <SelectItem value="no_ai_card">Yellow Ganesha Card (Instant)</SelectItem>
                        <SelectItem value="no_ai_royal">Royal Maroon (Instant)</SelectItem>
                        <SelectItem value="no_ai_floral">Elegant Cream & Gold (Instant)</SelectItem>
                        <SelectItem value="no_ai_modern">Modern Pink (Instant)</SelectItem>
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>AI Generated Backgrounds (Requires API Key)</SelectLabel>
                        <SelectItem value="traditional">Traditional Indian (AI)</SelectItem>
                        <SelectItem value="modern">Modern Minimalist (AI)</SelectItem>
                        <SelectItem value="floral">Romantic Floral (AI)</SelectItem>
                        <SelectItem value="royal">Royal Rajput (AI)</SelectItem>
                        <SelectItem value="card_photo">AI Ganesha Card (AI)</SelectItem>
                        <SelectItem value="match">Match Original Video (AI)</SelectItem>
                        <SelectItem value="custom">Custom Prompt (AI)</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                {bgStyle === 'custom' && (
                  <div className="space-y-2">
                    <Label htmlFor="aiPrompt">Custom Prompt</Label>
                    <Textarea
                      id="aiPrompt"
                      placeholder="Describe your perfect invitation background..."
                      value={aiPrompt}
                      onChange={(e) => { setAiPrompt(e.target.value); setBgImage(null); }}
                      disabled={isGeneratingBg || isProcessing}
                      className="min-h-[80px]"
                    />
                  </div>
                )}

                {bgStyle === 'match' && !videoFile && (
                  <p className="text-sm text-amber-600">Please upload an original video below to use this feature.</p>
                )}

                <div className="flex gap-4 items-start">
                  {!bgStyle.startsWith('no_ai_') && (
                    <Button
                      onClick={generateBackground}
                      disabled={isGeneratingBg || isProcessing || (bgStyle === 'custom' && !aiPrompt) || (bgStyle === 'match' && !videoFile)}
                      variant="secondary"
                      className="shrink-0"
                    >
                      {isGeneratingBg ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="mr-2 h-4 w-4 text-amber-500" />
                      )}
                      Generate AI Background Preview
                    </Button>
                  )}
                  {bgImage && !bgStyle.startsWith('no_ai_') && (
                    <div className="relative w-16 h-24 rounded-md overflow-hidden border shadow-sm shrink-0">
                      <img src={bgImage} alt="Generated Background" className="object-cover w-full h-full" />
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4 border-b pb-6">
                <Label className="text-base">2. Video Settings</Label>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label className="text-base">Merge with Original Video</Label>
                    <p className="text-sm text-neutral-500">
                      Combine the intro with your video, or just generate the intro.
                    </p>
                  </div>
                  <Switch
                    checked={mergeVideo}
                    onCheckedChange={setMergeVideo}
                    disabled={isProcessing}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="video">Original Invitation Video {mergeVideo || bgStyle === 'match' ? '' : '(Optional)'}</Label>
                  <div className="flex items-center gap-4">
                    <Input id="video" type="file" accept="video/*" onChange={handleFileChange} disabled={isProcessing} />
                  </div>
                  {!mergeVideo && !videoFile && bgStyle !== 'match' && (
                    <p className="text-xs text-neutral-500">Without a video, the intro will default to 1080x1920 (portrait).</p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-base">3. Text Content</Label>

                <div className="space-y-2">
                  <Label htmlFor="invitationText">Invitation Text (Supports Hindi)</Label>
                  <Textarea
                    id="invitationText"
                    placeholder="e.g. You are cordially invited / सप्रेम आमंत्रण"
                    value={invitationText}
                    onChange={(e) => setInvitationText(e.target.value)}
                    disabled={isProcessing}
                    className="min-h-[80px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Guest Name (Supports Hindi)</Label>
                  <Input
                    id="name"
                    placeholder="e.g. The Smith Family / शर्मा परिवार"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isProcessing}
                  />
                </div>
              </div>

              <Button
                className="w-full"
                onClick={processVideo}
                disabled={!name || !invitationText || !isReady || isProcessing || (mergeVideo && !videoFile)}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : !isReady ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading Engine...
                  </>
                ) : (
                  <>
                    <Video className="mr-2 h-4 w-4" />
                    Generate Video
                  </>
                )}
              </Button>

              {isProcessing && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-neutral-500">
                    <span>{statusText}</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} />
                </div>
              )}
              {!isProcessing && statusText && (
                <div className="text-sm text-neutral-500 text-center">
                  {statusText}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>Your generated video will appear here.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center min-h-[400px] bg-neutral-100 rounded-md border border-dashed border-neutral-300 overflow-hidden relative p-4">
              {resultUrl ? (
                <div className="w-full h-full flex flex-col items-center space-y-4">
                  <video src={resultUrl} controls className="max-h-[400px] w-auto rounded-md shadow-sm" />
                  <a href={resultUrl} download={`invitation-${name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.mp4`} className="inline-flex items-center justify-center rounded-lg border border-border bg-background hover:bg-muted hover:text-foreground h-8 px-2.5 text-sm font-medium">
                    <Download className="mr-2 h-4 w-4" />
                    Download Video
                  </a>
                </div>
              ) : videoFile ? (
                <video src={URL.createObjectURL(videoFile)} controls className="max-h-[400px] w-auto rounded-md shadow-sm opacity-50" />
              ) : (
                <div className="text-center text-neutral-400">
                  <Video className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  <p>No video selected yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
