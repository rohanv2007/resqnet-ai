import type { AlertLanguage } from "@/types";

// Phrase-level template translations. Used as a fallback when no external
// translation API key is configured. Keys are the canonical English phrase.
type Dict = Partial<Record<AlertLanguage, string>>;

const DICT: Record<string, Dict> = {
  "Heavy rainfall warning": {
    hindi: "भारी वर्षा की चेतावनी",
    malayalam: "കനത്ത മഴ മുന്നറിയിപ്പ്",
    tamil: "கனமழை எச்சரிக்கை",
    telugu: "భారీ వర్షం హెచ్చరిక",
    bengali: "ভারী বৃষ্টিপাতের সতর্কতা",
    odia: "ଭାରୀ ବର୍ଷା ସତର୍କତା",
  },
  "Cyclone warning": {
    hindi: "चक्रवात चेतावनी",
    malayalam: "ചുഴലിക്കാറ്റ് മുന്നറിയിപ്പ്",
    tamil: "புயல் எச்சரிக்கை",
    telugu: "తుఫాన్ హెచ్చరిక",
    bengali: "ঘূর্ণিঝড় সতর্কতা",
    odia: "ବାତ୍ୟା ସତର୍କତା",
  },
  "Flood risk": {
    hindi: "बाढ़ का खतरा",
    malayalam: "വെള്ളപ്പൊക്ക സാധ്യത",
    tamil: "வெள்ள ஆபத்து",
    telugu: "వరద ప్రమాదం",
    bengali: "বন্যার ঝুঁকি",
    odia: "ବନ୍ୟା ବିପଦ",
  },
  "Move to nearest shelter": {
    hindi: "निकटतम आश्रय स्थल पर जाएँ",
    malayalam: "ഏറ്റവും അടുത്ത അഭയകേന്ദ്രത്തിലേക്ക് മാറുക",
    tamil: "அருகிலுள்ள புகலிடத்திற்கு செல்லவும்",
    telugu: "సమీపంలోని ఆశ్రయానికి తరలండి",
    bengali: "নিকটতম আশ্রয়স্থলে যান",
    odia: "ନିକଟବର୍ତ୍ତୀ ଆଶ୍ରୟ ସ୍ଥାନକୁ ଯାଆନ୍ତୁ",
  },
  "Evacuate immediately": {
    hindi: "तुरंत निकल जाएँ",
    malayalam: "ഉടനെ ഒഴിപ്പിക്കുക",
    tamil: "உடனடியாக வெளியேறவும்",
    telugu: "వెంటనే ఖాళీ చేయండి",
    bengali: "অবিলম্বে সরে যান",
    odia: "ତୁରନ୍ତ ସ୍ଥାନାନ୍ତର ହୁଅନ୍ତୁ",
  },
  "nearest shelter immediately": {
    hindi: "तुरंत निकटतम आश्रय स्थल पर",
    malayalam: "ഉടനെ ഏറ്റവും അടുത്ത അഭയകേന്ദ്രത്തിലേക്ക്",
    tamil: "உடனடியாக அருகிலுள்ள புகலிடத்திற்கு",
    telugu: "వెంటనే సమీప ఆశ్రయానికి",
    bengali: "অবিলম্বে নিকটতম আশ্রয়ে",
    odia: "ତୁରନ୍ତ ନିକଟବର୍ତ୍ତୀ ଆଶ୍ରୟକୁ",
  },
  "Move to": {
    hindi: "जाएँ —",
    malayalam: "പോകുക —",
    tamil: "செல்லவும் —",
    telugu: "తరలండి —",
    bengali: "যান —",
    odia: "ଯାଆନ୍ତୁ —",
  },
  "Heavy rainfall expected": {
    hindi: "भारी वर्षा की संभावना",
    malayalam: "കനത്ത മഴ പ്രതീക്ഷിക്കുന്നു",
    tamil: "கனமழை எதிர்பார்க்கப்படுகிறது",
    telugu: "భారీ వర్షం అంచనా",
    bengali: "ভারী বৃষ্টিপাতের সম্ভাবনা",
    odia: "ଭାରୀ ବର୍ଷା ସମ୍ଭାବନା",
  },
};

export function translateTemplate(text: string, target: AlertLanguage): string {
  if (target === "english") return text;
  let out = text;
  // Replace every matching English phrase, not just the first one.
  for (const [en, dict] of Object.entries(DICT)) {
    const translated = dict[target];
    if (!translated) continue;
    const re = new RegExp(en.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    out = out.replace(re, translated);
  }
  return out;
}
