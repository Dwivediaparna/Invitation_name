'use client';

import { useState, useRef, useEffect } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { GoogleGenAI } from '@google/genai';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Loader2, Video, Download, Sparkles, Image as ImageIcon } from 'lucide-react';

export default function Home() {
  const [name, setName] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [mergeVideo, setMergeVideo] = useState(false);
  const [bgStyle, setBgStyle] = useState('traditional');
  const [aiPrompt, setAiPrompt] = useState('');
  const [invitationText, setInvitationText] = useState('You are cordially invited');
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [isGeneratingBg, setIsGeneratingBg] = useState(false);
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
  }, []);

  useEffect(() => {
    if (bgStyle === 'card_photo') {
      setInvitationText('अपर्णा 🥁 दीपक');
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

  const fetchAiBackground = async (): Promise<string | null> => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });
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
        finalPrompt = 'A blank traditional Indian wedding invitation card background. Golden yellow textured paper. Top center has a beautiful red and gold Lord Ganesha illustration surrounded by auspicious symbols like Om and Kalash. The entire bottom half and center MUST be completely empty golden yellow paper with NO text and NO objects. Portrait orientation, clean, highly detailed.';
      } else if (bgStyle === 'match' && videoFile) {
        setStatusText('Analyzing video style...');
        const frameDataUrl = await extractFrame(videoFile);
        const base64Data = frameDataUrl.split(',')[1];
        
        const visionResponse = await ai.models.generateContent({
          model: 'gemini-3.1-flash-preview',
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

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: finalPrompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: "9:16",
          }
        }
      });
      
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const base64EncodeString = part.inlineData.data;
          const mimeType = part.inlineData.mimeType || 'image/png';
          return `data:${mimeType};base64,${base64EncodeString}`;
        }
      }
    } catch (error) {
      console.error('Error generating background:', error);
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
      img.crossOrigin = "anonymous";
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
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
      
      if (bgStyle === 'card_photo') {
        // Golden textured background
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, '#E8B851');
        gradient.addColorStop(0.5, '#D4A535');
        gradient.addColorStop(1, '#C4922A');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // Subtle texture overlay
        for (let i = 0; i < 800; i++) {
          ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.03})`;
          ctx.fillRect(Math.random() * width, Math.random() * height, Math.random() * 3 * scale, Math.random() * 3 * scale);
        }

        // Ornate double border
        ctx.strokeStyle = '#7A1712';
        ctx.lineWidth = 6 * scale;
        ctx.strokeRect(30 * scale, 30 * scale, width - 60 * scale, height - 60 * scale);
        ctx.lineWidth = 2 * scale;
        ctx.strokeRect(42 * scale, 42 * scale, width - 84 * scale, height - 84 * scale);

        // Corner flourishes
        const drawCornerFlourish = (cx: number, cy: number, flipX: number, flipY: number) => {
          ctx.save();
          ctx.translate(cx, cy);
          ctx.scale(flipX, flipY);
          ctx.strokeStyle = '#7A1712';
          ctx.lineWidth = 3 * scale;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(40 * scale, 5 * scale, 60 * scale, 30 * scale);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(5 * scale, 40 * scale, 30 * scale, 60 * scale);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(20 * scale, 20 * scale, 8 * scale, 0, Math.PI * 2);
          ctx.fillStyle = '#7A1712';
          ctx.fill();
          ctx.restore();
        };
        drawCornerFlourish(50 * scale, 50 * scale, 1, 1);
        drawCornerFlourish(width - 50 * scale, 50 * scale, -1, 1);
        drawCornerFlourish(50 * scale, height - 50 * scale, 1, -1);
        drawCornerFlourish(width - 50 * scale, height - 50 * scale, -1, -1);

        // === Lord Ganesha Illustration ===
        const gcx = width / 2; // center x
        const gcy = height * 0.26; // center y

        // Mandala rings behind Ganesha
        for (let r = 0; r < 3; r++) {
          const radius = (200 + r * 30) * scale;
          ctx.beginPath();
          ctx.arc(gcx, gcy, radius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(122, 23, 18, ${0.12 - r * 0.03})`;
          ctx.lineWidth = (3 - r) * scale;
          ctx.stroke();
          // Dots on mandala
          const dots = 24 - r * 4;
          for (let d = 0; d < dots; d++) {
            const angle = (d / dots) * Math.PI * 2;
            const dx = gcx + Math.cos(angle) * radius;
            const dy = gcy + Math.sin(angle) * radius;
            ctx.beginPath();
            ctx.arc(dx, dy, (3 - r) * scale, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(122, 23, 18, ${0.2 - r * 0.05})`;
            ctx.fill();
          }
        }

        // Glow / aura behind Ganesha
        const glow = ctx.createRadialGradient(gcx, gcy, 0, gcx, gcy, 160 * scale);
        glow.addColorStop(0, 'rgba(255, 200, 50, 0.3)');
        glow.addColorStop(1, 'rgba(255, 200, 50, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(gcx, gcy, 160 * scale, 0, Math.PI * 2);
        ctx.fill();

        // --- Ganesha Body (stylized) ---
        const gs = scale; // ganesha scale factor

        // Lotus base
        ctx.save();
        for (let p = 0; p < 10; p++) {
          const angle = (p / 10) * Math.PI * 2 - Math.PI / 2;
          const px = gcx + Math.cos(angle) * 90 * gs;
          const py = gcy + 120 * gs + Math.sin(angle) * 20 * gs;
          ctx.beginPath();
          ctx.ellipse(px, py, 35 * gs, 18 * gs, angle + Math.PI / 2, 0, Math.PI * 2);
          ctx.fillStyle = p % 2 === 0 ? '#C0392B' : '#E74C3C';
          ctx.fill();
          ctx.strokeStyle = '#922B21';
          ctx.lineWidth = 1.5 * gs;
          ctx.stroke();
        }
        ctx.restore();

        // Belly / body
        ctx.beginPath();
        ctx.ellipse(gcx, gcy + 50 * gs, 75 * gs, 80 * gs, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#C0392B';
        ctx.fill();
        ctx.strokeStyle = '#922B21';
        ctx.lineWidth = 3 * gs;
        ctx.stroke();

        // Belly band (golden)
        ctx.beginPath();
        ctx.ellipse(gcx, gcy + 50 * gs, 78 * gs, 30 * gs, 0, 0.1, Math.PI - 0.1);
        ctx.strokeStyle = '#D4AF37';
        ctx.lineWidth = 4 * gs;
        ctx.stroke();

        // Head
        ctx.beginPath();
        ctx.ellipse(gcx, gcy - 30 * gs, 60 * gs, 65 * gs, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#E74C3C';
        ctx.fill();
        ctx.strokeStyle = '#922B21';
        ctx.lineWidth = 3 * gs;
        ctx.stroke();

        // Left ear
        ctx.beginPath();
        ctx.ellipse(gcx - 65 * gs, gcy - 20 * gs, 30 * gs, 40 * gs, -0.3, 0, Math.PI * 2);
        ctx.fillStyle = '#C0392B';
        ctx.fill();
        ctx.strokeStyle = '#922B21';
        ctx.lineWidth = 2.5 * gs;
        ctx.stroke();
        // Inner ear
        ctx.beginPath();
        ctx.ellipse(gcx - 63 * gs, gcy - 18 * gs, 18 * gs, 28 * gs, -0.3, 0, Math.PI * 2);
        ctx.fillStyle = '#E8B851';
        ctx.fill();

        // Right ear
        ctx.beginPath();
        ctx.ellipse(gcx + 65 * gs, gcy - 20 * gs, 30 * gs, 40 * gs, 0.3, 0, Math.PI * 2);
        ctx.fillStyle = '#C0392B';
        ctx.fill();
        ctx.strokeStyle = '#922B21';
        ctx.lineWidth = 2.5 * gs;
        ctx.stroke();
        // Inner ear
        ctx.beginPath();
        ctx.ellipse(gcx + 63 * gs, gcy - 18 * gs, 18 * gs, 28 * gs, 0.3, 0, Math.PI * 2);
        ctx.fillStyle = '#E8B851';
        ctx.fill();

        // Crown / Mukut
        ctx.beginPath();
        ctx.moveTo(gcx - 45 * gs, gcy - 80 * gs);
        ctx.lineTo(gcx - 30 * gs, gcy - 130 * gs);
        ctx.lineTo(gcx - 15 * gs, gcy - 100 * gs);
        ctx.lineTo(gcx, gcy - 145 * gs);
        ctx.lineTo(gcx + 15 * gs, gcy - 100 * gs);
        ctx.lineTo(gcx + 30 * gs, gcy - 130 * gs);
        ctx.lineTo(gcx + 45 * gs, gcy - 80 * gs);
        ctx.closePath();
        ctx.fillStyle = '#D4AF37';
        ctx.fill();
        ctx.strokeStyle = '#B8860B';
        ctx.lineWidth = 2 * gs;
        ctx.stroke();

        // Crown jewels
        const crownJewels = [
          { x: -30, y: -120 },
          { x: 0, y: -135 },
          { x: 30, y: -120 },
        ];
        crownJewels.forEach(j => {
          ctx.beginPath();
          ctx.arc(gcx + j.x * gs, gcy + j.y * gs, 6 * gs, 0, Math.PI * 2);
          ctx.fillStyle = '#E74C3C';
          ctx.fill();
          ctx.strokeStyle = '#D4AF37';
          ctx.lineWidth = 2 * gs;
          ctx.stroke();
        });

        // Eyes
        ctx.beginPath();
        ctx.ellipse(gcx - 22 * gs, gcy - 35 * gs, 12 * gs, 8 * gs, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(gcx - 22 * gs, gcy - 35 * gs, 5 * gs, 0, Math.PI * 2);
        ctx.fillStyle = '#1A1A1A';
        ctx.fill();

        ctx.beginPath();
        ctx.ellipse(gcx + 22 * gs, gcy - 35 * gs, 12 * gs, 8 * gs, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(gcx + 22 * gs, gcy - 35 * gs, 5 * gs, 0, Math.PI * 2);
        ctx.fillStyle = '#1A1A1A';
        ctx.fill();

        // Tilak on forehead
        ctx.beginPath();
        ctx.moveTo(gcx, gcy - 60 * gs);
        ctx.lineTo(gcx - 8 * gs, gcy - 48 * gs);
        ctx.lineTo(gcx + 8 * gs, gcy - 48 * gs);
        ctx.closePath();
        ctx.fillStyle = '#D4AF37';
        ctx.fill();

        // Trunk (curving to the left)
        ctx.beginPath();
        ctx.moveTo(gcx - 8 * gs, gcy - 10 * gs);
        ctx.quadraticCurveTo(gcx - 50 * gs, gcy + 20 * gs, gcx - 40 * gs, gcy + 60 * gs);
        ctx.quadraticCurveTo(gcx - 35 * gs, gcy + 75 * gs, gcx - 20 * gs, gcy + 70 * gs);
        ctx.quadraticCurveTo(gcx - 30 * gs, gcy + 55 * gs, gcx - 35 * gs, gcy + 40 * gs);
        ctx.quadraticCurveTo(gcx - 40 * gs, gcy + 10 * gs, gcx + 5 * gs, gcy - 10 * gs);
        ctx.fillStyle = '#E74C3C';
        ctx.fill();
        ctx.strokeStyle = '#922B21';
        ctx.lineWidth = 2 * gs;
        ctx.stroke();

        // Trunk tip curl
        ctx.beginPath();
        ctx.arc(gcx - 25 * gs, gcy + 68 * gs, 8 * gs, 0, Math.PI * 2);
        ctx.fillStyle = '#E74C3C';
        ctx.fill();

        // Tusk (right side)
        ctx.beginPath();
        ctx.moveTo(gcx + 12 * gs, gcy - 5 * gs);
        ctx.quadraticCurveTo(gcx + 20 * gs, gcy + 15 * gs, gcx + 15 * gs, gcy + 25 * gs);
        ctx.lineTo(gcx + 10 * gs, gcy + 20 * gs);
        ctx.quadraticCurveTo(gcx + 13 * gs, gcy + 10 * gs, gcx + 8 * gs, gcy - 3 * gs);
        ctx.fillStyle = '#FFFFF0';
        ctx.fill();
        ctx.strokeStyle = '#D4AF37';
        ctx.lineWidth = 1 * gs;
        ctx.stroke();

        // Left arm holding modak (sweet)
        ctx.beginPath();
        ctx.ellipse(gcx - 60 * gs, gcy + 60 * gs, 15 * gs, 20 * gs, -0.5, 0, Math.PI * 2);
        ctx.fillStyle = '#C0392B';
        ctx.fill();
        ctx.strokeStyle = '#922B21';
        ctx.lineWidth = 2 * gs;
        ctx.stroke();
        // Modak
        ctx.beginPath();
        ctx.arc(gcx - 70 * gs, gcy + 48 * gs, 12 * gs, 0, Math.PI * 2);
        ctx.fillStyle = '#F5DEB3';
        ctx.fill();
        ctx.strokeStyle = '#D4AF37';
        ctx.lineWidth = 1.5 * gs;
        ctx.stroke();

        // Right arm raised (blessing)
        ctx.beginPath();
        ctx.ellipse(gcx + 65 * gs, gcy + 30 * gs, 15 * gs, 25 * gs, 0.4, 0, Math.PI * 2);
        ctx.fillStyle = '#C0392B';
        ctx.fill();
        ctx.strokeStyle = '#922B21';
        ctx.lineWidth = 2 * gs;
        ctx.stroke();
        // Palm (blessing gesture)
        ctx.beginPath();
        ctx.ellipse(gcx + 75 * gs, gcy + 10 * gs, 14 * gs, 16 * gs, 0.2, 0, Math.PI * 2);
        ctx.fillStyle = '#E74C3C';
        ctx.fill();
        ctx.strokeStyle = '#922B21';
        ctx.lineWidth = 1.5 * gs;
        ctx.stroke();

        // Necklace
        ctx.beginPath();
        ctx.ellipse(gcx, gcy + 10 * gs, 45 * gs, 20 * gs, 0, 0.2, Math.PI - 0.2);
        ctx.strokeStyle = '#D4AF37';
        ctx.lineWidth = 4 * gs;
        ctx.stroke();
        // Necklace gems
        for (let n = 0; n < 7; n++) {
          const nAngle = 0.3 + ((Math.PI - 0.6) / 6) * n;
          const nx = gcx + Math.cos(nAngle) * 45 * gs;
          const ny = gcy + 10 * gs + Math.sin(nAngle) * 20 * gs;
          ctx.beginPath();
          ctx.arc(nx, ny, 4 * gs, 0, Math.PI * 2);
          ctx.fillStyle = n % 2 === 0 ? '#E74C3C' : '#2ECC71';
          ctx.fill();
          ctx.strokeStyle = '#D4AF37';
          ctx.lineWidth = 1 * gs;
          ctx.stroke();
        }

        // Om symbol (ॐ) at top
        ctx.font = `bold ${50 * gs}px "Noto Serif Devanagari", serif`;
        ctx.fillStyle = '#7A1712';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('ॐ', gcx, gcy - 175 * gs);

        // Decorative divider line below Ganesha
        const divY = gcy + 155 * gs;
        ctx.beginPath();
        ctx.moveTo(width * 0.2, divY);
        ctx.lineTo(width * 0.8, divY);
        ctx.strokeStyle = '#7A1712';
        ctx.lineWidth = 2 * gs;
        ctx.stroke();
        // Center diamond on divider
        ctx.beginPath();
        ctx.moveTo(gcx, divY - 8 * gs);
        ctx.lineTo(gcx + 8 * gs, divY);
        ctx.lineTo(gcx, divY + 8 * gs);
        ctx.lineTo(gcx - 8 * gs, divY);
        ctx.closePath();
        ctx.fillStyle = '#7A1712';
        ctx.fill();

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
    
    if (bgStyle === 'card_photo') {
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
      ctx.fillStyle = '#8b0000'; // Dark red
      ctx.font = `italic 600 ${60 * scale}px "Noto Serif Devanagari", Georgia, serif`;
      (ctx as any).letterSpacing = `${1 * scale}px`;
      
      const lines = invitationText.split('\n');
      let textY = height / 2 - 100 * scale;
      lines.forEach((line) => {
        ctx.fillText(line, width / 2, textY);
        textY += 70 * scale;
      });

      ctx.fillStyle = '#000000';
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

      let currentBgImage = bgImage;
      if (!currentBgImage && (bgStyle !== 'custom' || aiPrompt)) {
        setStatusText('Generating AI background...');
        currentBgImage = await fetchAiBackground();
        if (currentBgImage) setBgImage(currentBgImage);
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
                      <SelectItem value="traditional">Traditional Indian</SelectItem>
                      <SelectItem value="modern">Modern Minimalist</SelectItem>
                      <SelectItem value="floral">Romantic Floral</SelectItem>
                      <SelectItem value="royal">Royal Rajput</SelectItem>
                      <SelectItem value="card_photo">Yellow Ganesha Card (Like Photo)</SelectItem>
                      <SelectItem value="match">Match Original Video</SelectItem>
                      <SelectItem value="custom">Custom Prompt</SelectItem>
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
                    Generate Background
                  </Button>
                  {bgImage && (
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
