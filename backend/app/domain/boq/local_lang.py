"""City-aware carpenter specification.

Suresh — and his cousin Aravind in Chennai, his neighbour Karthik in Bengaluru,
his uncle Tapan in Kolkata — does not work in English. Each carpenter section
is generated in the language the user's chosen city actually speaks, so the
spec arrives on site without translation friction.

City → language map:
  Mumbai, Pune        → Marathi
  Delhi               → Hindi
  Bangalore           → Kannada
  Chennai             → Tamil
  Hyderabad           → Telugu
  Kolkata             → Bengali
  (anywhere else)     → Hindi (lingua franca for trades across north India)

Technical carpentry vocabulary (plywood grade, hinges, edge banding, hardware
codes) is universally transliterated on Indian job sites — translating those
would actually *reduce* clarity for Suresh. So the spec keeps the technical
terms transliterated in the local script.
"""
from __future__ import annotations

from dataclasses import dataclass

from app.domain.boq.boq import BOQ


@dataclass(frozen=True)
class LangPack:
    code: str                    # ISO 639-1 — "hi", "mr", "bn", "ta", "te", "kn"
    name_en: str                 # English name of the language ("Hindi", "Tamil")
    name_native: str             # Native script ("हिंदी", "தமிழ்")
    section_heading_en: str      # English label for the section ("Hindi Specification")
    section_heading_native: str  # Native tagline shown beside it
    spec_title: str              # Native title for the body block
    spec_subtitle_en: str        # English helper line (always "Carpenter Specification — <Lang>")
    general_title: str           # Native title for "General Instructions"
    general_subtitle_en: str
    material_lines: tuple[str, ...]   # 4 lines: ply, joinery, edge banding, hardware
    general_lines: tuple[str, ...]    # 6 lines of on-site instructions
    price_label: str             # Native "Price: Rs."
    furniture: dict[str, str]    # English keyword → native term


# ────────────────────────── Hindi (default) ─────────────────────────────

HINDI = LangPack(
    code="hi",
    name_en="Hindi",
    name_native="हिंदी",
    section_heading_en="Hindi Specification",
    section_heading_native="बजट और सामग्री",
    spec_title="कारपेंटर के लिए स्पेसिफ़िकेशन",
    spec_subtitle_en="Carpenter Specification — Hindi",
    general_title="सामान्य निर्देश",
    general_subtitle_en="General Instructions",
    material_lines=(
        "मटेरियल: 18mm BWP मरीन प्लाई, लैमिनेट फ़िनिश",
        "जॉइनरी: डॉवेल + कन्फ़र्मेट स्क्रू, कंसील्ड हिंज (छुपे हुए कब्ज़े)",
        "किनारे: 2mm PVC एज बैंडिंग, मैचिंग कलर",
        "हार्डवेयर: SS304 स्टेनलेस स्टील — जंग न लगे",
    ),
    general_lines=(
        "साइट पर माप (measurement) लेकर ही कटिंग करें।",
        "सभी प्लाई 18mm BWP मरीन ग्रेड — ISI मार्क वाली हो।",
        "लैमिनेट: 1mm मोटाई, मैचिंग एज बैंड के साथ।",
        "सभी स्क्रू स्टेनलेस स्टील (SS304) — जंग न लगे।",
        "काम ख़त्म होने पर सफ़ाई करके जमा करें।",
        "कोई भी बदलाव करने से पहले मालिक से पूछें।",
    ),
    price_label="कीमत: रुपये",
    furniture={
        "wardrobe": "अलमारी",
        "almirah": "अलमारी",
        "bed": "पलंग",
        "tv unit": "टीवी यूनिट",
        "entertainment unit": "टीवी यूनिट",
        "shoe rack": "जूता रैक",
        "puja unit": "पूजा घर / मंदिर",
        "pooja unit": "पूजा घर / मंदिर",
        "puja mandir": "पूजा मंदिर",
        "wall shelf": "दीवार पर शेल्फ",
        "storage unit": "स्टोरेज यूनिट",
        "loft": "लॉफ्ट / मचान",
        "cabinet": "कैबिनेट",
        "false ceiling": "फॉल्स सीलिंग",
        "partition": "पार्टीशन",
        "panel": "पैनल",
        "breakfast counter": "ब्रेकफास्ट काउंटर",
        "bar unit": "बार यूनिट",
        "dining table": "डाइनिंग टेबल",
        "sofa": "सोफा",
        "chair": "कुर्सी",
        "desk": "डेस्क / मेज़",
        "table": "टेबल",
        "nightstand": "साइड टेबल",
        "dresser": "ड्रेसर",
        "dressing table": "ड्रेसिंग टेबल",
        "bookshelf": "किताबों की अलमारी",
        "drawer": "दराज़",
    },
)


# ────────────────────────── Marathi (Mumbai, Pune) ───────────────────────

MARATHI = LangPack(
    code="mr",
    name_en="Marathi",
    name_native="मराठी",
    section_heading_en="Marathi Specification",
    section_heading_native="बजेट आणि सामग्री",
    spec_title="सुतारासाठी स्पेसिफिकेशन",
    spec_subtitle_en="Carpenter Specification — Marathi",
    general_title="सामान्य सूचना",
    general_subtitle_en="General Instructions",
    material_lines=(
        "मटेरियल: 18mm BWP मरीन प्लाय, लॅमिनेट फिनिश",
        "जॉइनरी: डॉवेल + कन्फर्मेट स्क्रू, कन्सील्ड हिंज (लपवलेले कबजे)",
        "कडा: 2mm PVC एज बँडिंग, मॅचिंग रंग",
        "हार्डवेअर: SS304 स्टेनलेस स्टील — गंज लागू नये",
    ),
    general_lines=(
        "साइटवर माप घेऊनच कटिंग करा.",
        "सर्व प्लाय 18mm BWP मरीन ग्रेड — ISI मार्क असलेला असावा.",
        "लॅमिनेट: 1mm जाडी, मॅचिंग एज बँडसह.",
        "सर्व स्क्रू स्टेनलेस स्टील (SS304) — गंज लागू नये.",
        "काम पूर्ण झाल्यावर साफसफाई करून ताबा द्यावा.",
        "कोणताही बदल करण्यापूर्वी मालकाला विचारावे.",
    ),
    price_label="किंमत: रुपये",
    furniture={
        "wardrobe": "कपाट",
        "almirah": "कपाट",
        "bed": "पलंग",
        "tv unit": "टीव्ही युनिट",
        "entertainment unit": "टीव्ही युनिट",
        "shoe rack": "बूट रॅक",
        "puja unit": "देव्हारा",
        "pooja unit": "देव्हारा",
        "puja mandir": "देव्हारा / मंदिर",
        "wall shelf": "भिंतीवरील शेल्फ",
        "storage unit": "साठवण कपाट",
        "loft": "माळा",
        "cabinet": "कॅबिनेट",
        "false ceiling": "फॉल्स सीलिंग",
        "partition": "पार्टीशन",
        "panel": "पॅनेल",
        "breakfast counter": "ब्रेकफास्ट काउंटर",
        "bar unit": "बार युनिट",
        "dining table": "डायनिंग टेबल",
        "sofa": "सोफा",
        "chair": "खुर्ची",
        "desk": "डेस्क / टेबल",
        "table": "टेबल",
        "nightstand": "साइड टेबल",
        "dresser": "ड्रेसर",
        "dressing table": "ड्रेसिंग टेबल",
        "bookshelf": "पुस्तकांचे कपाट",
        "drawer": "ड्रॉवर",
    },
)


# ────────────────────────── Bengali (Kolkata) ────────────────────────────

BENGALI = LangPack(
    code="bn",
    name_en="Bengali",
    name_native="বাংলা",
    section_heading_en="Bengali Specification",
    section_heading_native="বাজেট ও সামগ্রী",
    spec_title="কাঠমিস্ত্রির জন্য স্পেসিফিকেশন",
    spec_subtitle_en="Carpenter Specification — Bengali",
    general_title="সাধারণ নির্দেশাবলী",
    general_subtitle_en="General Instructions",
    material_lines=(
        "ম্যাটেরিয়াল: 18mm BWP মেরিন প্লাই, ল্যামিনেট ফিনিশ",
        "জয়েনারি: ডাওয়েল + কনফরমেট স্ক্রু, কনসিল্ড হিঞ্জ (লুকানো কব্জা)",
        "ধার: 2mm PVC এজ ব্যান্ডিং, ম্যাচিং রং",
        "হার্ডওয়্যার: SS304 স্টেইনলেস স্টিল — মরচে না ধরে",
    ),
    general_lines=(
        "সাইটে মাপ নিয়েই কাটিং করতে হবে।",
        "সমস্ত প্লাই 18mm BWP মেরিন গ্রেড — ISI মার্ক যুক্ত হতে হবে।",
        "ল্যামিনেট: 1mm পুরুত্ব, ম্যাচিং এজ ব্যান্ড সহ।",
        "সমস্ত স্ক্রু স্টেইনলেস স্টিল (SS304) — মরচে না ধরে।",
        "কাজ শেষ হলে পরিষ্কার করে হস্তান্তর করুন।",
        "কোনো পরিবর্তন করার আগে মালিককে জিজ্ঞাসা করুন।",
    ),
    price_label="মূল্য: টাকা",
    furniture={
        "wardrobe": "আলমারি",
        "almirah": "আলমারি",
        "bed": "খাট",
        "tv unit": "টিভি ইউনিট",
        "entertainment unit": "টিভি ইউনিট",
        "shoe rack": "জুতোর র‍্যাক",
        "puja unit": "ঠাকুরঘর",
        "pooja unit": "ঠাকুরঘর",
        "puja mandir": "ঠাকুরঘর / মন্দির",
        "wall shelf": "দেওয়ালের শেলফ",
        "storage unit": "স্টোরেজ ইউনিট",
        "loft": "চিলেকোঠা",
        "cabinet": "ক্যাবিনেট",
        "false ceiling": "ফলস সিলিং",
        "partition": "পার্টিশন",
        "panel": "প্যানেল",
        "breakfast counter": "ব্রেকফাস্ট কাউন্টার",
        "bar unit": "বার ইউনিট",
        "dining table": "ডাইনিং টেবিল",
        "sofa": "সোফা",
        "chair": "চেয়ার",
        "desk": "ডেস্ক / টেবিল",
        "table": "টেবিল",
        "nightstand": "সাইড টেবিল",
        "dresser": "ড্রেসার",
        "dressing table": "ড্রেসিং টেবিল",
        "bookshelf": "বইয়ের আলমারি",
        "drawer": "ড্রয়ার",
    },
)


# ────────────────────────── Tamil (Chennai) ──────────────────────────────

TAMIL = LangPack(
    code="ta",
    name_en="Tamil",
    name_native="தமிழ்",
    section_heading_en="Tamil Specification",
    section_heading_native="பட்ஜெட் மற்றும் பொருட்கள்",
    spec_title="தச்சருக்கான விவரக்குறிப்பு",
    spec_subtitle_en="Carpenter Specification — Tamil",
    general_title="பொது வழிமுறைகள்",
    general_subtitle_en="General Instructions",
    material_lines=(
        "மெட்டீரியல்: 18mm BWP மரைன் ப்ளை, லேமினேட் ஃபினிஷ்",
        "ஜாயினரி: டவெல் + கன்ஃபர்மேட் ஸ்க்ரூ, கன்சீல்ட் ஹிஞ்ச் (மறைக்கப்பட்ட கீல்)",
        "ஓரம்: 2mm PVC எட்ஜ் பேண்டிங், மேட்சிங் கலர்",
        "ஹார்ட்வேர்: SS304 ஸ்டெய்ன்லெஸ் ஸ்டீல் — துரு பிடிக்காத",
    ),
    general_lines=(
        "சைட்டில் அளவு எடுத்த பின்னரே வெட்ட வேண்டும்.",
        "அனைத்து ப்ளையும் 18mm BWP மரைன் கிரேட் — ISI மார்க் உள்ளதாக இருக்க வேண்டும்.",
        "லேமினேட்: 1mm தடிமன், மேட்சிங் எட்ஜ் பேண்ட் உடன்.",
        "அனைத்து ஸ்க்ரூவும் ஸ்டெய்ன்லெஸ் ஸ்டீல் (SS304) — துரு பிடிக்காத.",
        "வேலை முடிந்த பின் சுத்தம் செய்து ஒப்படைக்க வேண்டும்.",
        "எந்த மாற்றமும் செய்வதற்கு முன் உரிமையாளரிடம் கேட்க வேண்டும்.",
    ),
    price_label="விலை: ரூ.",
    furniture={
        "wardrobe": "அலமாரி",
        "almirah": "அலமாரி",
        "bed": "கட்டில்",
        "tv unit": "டிவி யூனிட்",
        "entertainment unit": "டிவி யூனிட்",
        "shoe rack": "செருப்பு ரேக்",
        "puja unit": "பூஜை அறை",
        "pooja unit": "பூஜை அறை",
        "puja mandir": "பூஜை அறை / மண்டிர்",
        "wall shelf": "சுவர் அலமாரி",
        "storage unit": "சேமிப்பு அலமாரி",
        "loft": "மேல் தட்டு",
        "cabinet": "கேபினட்",
        "false ceiling": "ஃபால்ஸ் சீலிங்",
        "partition": "பார்டிஷன்",
        "panel": "பேனல்",
        "breakfast counter": "காலை உணவு கவுண்டர்",
        "bar unit": "பார் யூனிட்",
        "dining table": "டைனிங் டேபிள்",
        "sofa": "சோபா",
        "chair": "நாற்காலி",
        "desk": "டெஸ்க் / மேசை",
        "table": "மேசை",
        "nightstand": "பக்க மேசை",
        "dresser": "டிரஸ்ஸர்",
        "dressing table": "டிரஸ்ஸிங் டேபிள்",
        "bookshelf": "புத்தக அலமாரி",
        "drawer": "டிராயர்",
    },
)


# ────────────────────────── Telugu (Hyderabad) ───────────────────────────

TELUGU = LangPack(
    code="te",
    name_en="Telugu",
    name_native="తెలుగు",
    section_heading_en="Telugu Specification",
    section_heading_native="బడ్జెట్ మరియు సామగ్రి",
    spec_title="వడ్రంగి కోసం స్పెసిఫికేషన్",
    spec_subtitle_en="Carpenter Specification — Telugu",
    general_title="సాధారణ సూచనలు",
    general_subtitle_en="General Instructions",
    material_lines=(
        "మెటీరియల్: 18mm BWP మెరైన్ ప్లై, లామినేట్ ఫినిష్",
        "జాయినరీ: డవెల్ + కన్ఫర్మేట్ స్క్రూ, కన్సీల్డ్ హింజ్ (దాచిన కీలు)",
        "అంచులు: 2mm PVC ఎడ్జ్ బ్యాండింగ్, మ్యాచింగ్ రంగు",
        "హార్డ్‌వేర్: SS304 స్టెయిన్‌లెస్ స్టీల్ — తుప్పు పట్టదు",
    ),
    general_lines=(
        "సైట్‌లో కొలతలు తీసుకొని మాత్రమే కటింగ్ చేయండి.",
        "అన్ని ప్లై 18mm BWP మెరైన్ గ్రేడ్ — ISI మార్క్ ఉండాలి.",
        "లామినేట్: 1mm మందం, మ్యాచింగ్ ఎడ్జ్ బ్యాండ్‌తో.",
        "అన్ని స్క్రూలు స్టెయిన్‌లెస్ స్టీల్ (SS304) — తుప్పు పట్టదు.",
        "పని పూర్తయిన తర్వాత శుభ్రం చేసి అప్పగించండి.",
        "ఏదైనా మార్పు చేయడానికి ముందు యజమానిని అడగండి.",
    ),
    price_label="ధర: రూ.",
    furniture={
        "wardrobe": "బీరువా",
        "almirah": "బీరువా",
        "bed": "మంచం",
        "tv unit": "టీవీ యూనిట్",
        "entertainment unit": "టీవీ యూనిట్",
        "shoe rack": "షూ ర్యాక్",
        "puja unit": "పూజ గది",
        "pooja unit": "పూజ గది",
        "puja mandir": "పూజ గది / మందిరం",
        "wall shelf": "గోడ షెల్ఫ్",
        "storage unit": "స్టోరేజ్ యూనిట్",
        "loft": "మాడ / అటక",
        "cabinet": "క్యాబినెట్",
        "false ceiling": "ఫాల్స్ సీలింగ్",
        "partition": "పార్టిషన్",
        "panel": "ప్యానెల్",
        "breakfast counter": "బ్రేక్‌ఫాస్ట్ కౌంటర్",
        "bar unit": "బార్ యూనిట్",
        "dining table": "డైనింగ్ టేబుల్",
        "sofa": "సోఫా",
        "chair": "కుర్చీ",
        "desk": "డెస్క్ / టేబుల్",
        "table": "టేబుల్",
        "nightstand": "సైడ్ టేబుల్",
        "dresser": "డ్రెస్సర్",
        "dressing table": "డ్రెస్సింగ్ టేబుల్",
        "bookshelf": "పుస్తకాల అలమర",
        "drawer": "డ్రాయర్",
    },
)


# ────────────────────────── Kannada (Bangalore) ──────────────────────────

KANNADA = LangPack(
    code="kn",
    name_en="Kannada",
    name_native="ಕನ್ನಡ",
    section_heading_en="Kannada Specification",
    section_heading_native="ಬಜೆಟ್ ಮತ್ತು ಸಾಮಗ್ರಿ",
    spec_title="ಬಡಗಿಗಾಗಿ ವಿವರಣೆ",
    spec_subtitle_en="Carpenter Specification — Kannada",
    general_title="ಸಾಮಾನ್ಯ ಸೂಚನೆಗಳು",
    general_subtitle_en="General Instructions",
    material_lines=(
        "ಮೆಟೀರಿಯಲ್: 18mm BWP ಮೆರೈನ್ ಪ್ಲೈ, ಲ್ಯಾಮಿನೇಟ್ ಫಿನಿಶ್",
        "ಜಾಯಿನರಿ: ಡೋವೆಲ್ + ಕನ್ಫರ್ಮೇಟ್ ಸ್ಕ್ರೂ, ಕನ್ಸೀಲ್ಡ್ ಹಿಂಜ್ (ಮರೆಮಾಡಿದ ಕೀಲು)",
        "ಅಂಚುಗಳು: 2mm PVC ಎಡ್ಜ್ ಬ್ಯಾಂಡಿಂಗ್, ಮ್ಯಾಚಿಂಗ್ ಬಣ್ಣ",
        "ಹಾರ್ಡ್‌ವೇರ್: SS304 ಸ್ಟೇನ್‌ಲೆಸ್ ಸ್ಟೀಲ್ — ತುಕ್ಕು ಹಿಡಿಯದು",
    ),
    general_lines=(
        "ಸೈಟ್‌ನಲ್ಲಿ ಅಳತೆ ತೆಗೆದುಕೊಂಡ ನಂತರವೇ ಕಟಿಂಗ್ ಮಾಡಿ.",
        "ಎಲ್ಲಾ ಪ್ಲೈ 18mm BWP ಮೆರೈನ್ ಗ್ರೇಡ್ — ISI ಮಾರ್ಕ್ ಇರಬೇಕು.",
        "ಲ್ಯಾಮಿನೇಟ್: 1mm ದಪ್ಪ, ಮ್ಯಾಚಿಂಗ್ ಎಡ್ಜ್ ಬ್ಯಾಂಡ್‌ನೊಂದಿಗೆ.",
        "ಎಲ್ಲಾ ಸ್ಕ್ರೂಗಳು ಸ್ಟೇನ್‌ಲೆಸ್ ಸ್ಟೀಲ್ (SS304) — ತುಕ್ಕು ಹಿಡಿಯದು.",
        "ಕೆಲಸ ಮುಗಿದ ನಂತರ ಸ್ವಚ್ಛಗೊಳಿಸಿ ಒಪ್ಪಿಸಿ.",
        "ಯಾವುದೇ ಬದಲಾವಣೆ ಮಾಡುವ ಮೊದಲು ಮಾಲೀಕರನ್ನು ಕೇಳಿ.",
    ),
    price_label="ಬೆಲೆ: ರೂ.",
    furniture={
        "wardrobe": "ಬೀರು",
        "almirah": "ಬೀರು",
        "bed": "ಮಂಚ",
        "tv unit": "ಟಿವಿ ಯೂನಿಟ್",
        "entertainment unit": "ಟಿವಿ ಯೂನಿಟ್",
        "shoe rack": "ಶೂ ರ‍್ಯಾಕ್",
        "puja unit": "ಪೂಜಾ ಕೋಣೆ",
        "pooja unit": "ಪೂಜಾ ಕೋಣೆ",
        "puja mandir": "ಪೂಜಾ ಕೋಣೆ / ಮಂದಿರ",
        "wall shelf": "ಗೋಡೆ ಶೆಲ್ಫ್",
        "storage unit": "ಸ್ಟೋರೇಜ್ ಯೂನಿಟ್",
        "loft": "ಅಟ್ಟ",
        "cabinet": "ಕ್ಯಾಬಿನೆಟ್",
        "false ceiling": "ಫಾಲ್ಸ್ ಸೀಲಿಂಗ್",
        "partition": "ಪಾರ್ಟಿಷನ್",
        "panel": "ಪ್ಯಾನೆಲ್",
        "breakfast counter": "ಬ್ರೇಕ್‌ಫಾಸ್ಟ್ ಕೌಂಟರ್",
        "bar unit": "ಬಾರ್ ಯೂನಿಟ್",
        "dining table": "ಡೈನಿಂಗ್ ಟೇಬಲ್",
        "sofa": "ಸೋಫಾ",
        "chair": "ಕುರ್ಚಿ",
        "desk": "ಡೆಸ್ಕ್ / ಮೇಜು",
        "table": "ಮೇಜು",
        "nightstand": "ಪಕ್ಕದ ಮೇಜು",
        "dresser": "ಡ್ರೆಸ್ಸರ್",
        "dressing table": "ಡ್ರೆಸ್ಸಿಂಗ್ ಟೇಬಲ್",
        "bookshelf": "ಪುಸ್ತಕ ಕಪಾಟು",
        "drawer": "ಡ್ರಾಯರ್",
    },
)


# ────────────────────────── Dispatch ─────────────────────────────────────

_PACKS: dict[str, LangPack] = {
    "hi": HINDI,
    "mr": MARATHI,
    "bn": BENGALI,
    "ta": TAMIL,
    "te": TELUGU,
    "kn": KANNADA,
}

# Stored lower-case so lookup is case-insensitive. Users who pick "Other" in
# the intake type their city free-form ("mumbai", "MUMBAI", "Bengaluru, KA") —
# previously each variant fell through to the Hindi fallback even when we had
# the right pack on file.
_CITY_TO_LANG: dict[str, str] = {
    # Hindi-belt
    "delhi":     "hi",
    "new delhi": "hi",
    "lucknow":   "hi",
    "jaipur":    "hi",
    "patna":     "hi",
    # Marathi
    "mumbai": "mr",
    "pune":   "mr",
    "nagpur": "mr",
    # Bengali
    "kolkata":  "bn",
    "calcutta": "bn",
    # Tamil
    "chennai":    "ta",
    "coimbatore": "ta",
    "madras":     "ta",
    # Telugu
    "hyderabad": "te",
    "secunderabad": "te",
    # Kannada
    "bangalore": "kn",
    "bengaluru": "kn",
    "mysore":    "kn",
    "mysuru":    "kn",
}


def lang_for_city(city: str | None) -> LangPack:
    """Return the LangPack for a city. Falls back to Hindi for unknown cities —
    Hindi is the most universally-understood trade language across India.

    Lookup is case-insensitive and tolerates trailing punctuation like
    "Mumbai, MH" by checking the first comma-delimited token too."""
    if not city:
        return HINDI
    key = city.strip().lower()
    code = _CITY_TO_LANG.get(key)
    if not code and "," in key:
        code = _CITY_TO_LANG.get(key.split(",", 1)[0].strip())
    return _PACKS.get(code or "", HINDI)


def to_local_name(english: str, pack: LangPack) -> str:
    """Translate an English furniture description into the pack's vocabulary.
    Falls back to the English term (carpenters read enough English for
    common product nouns)."""
    name = english.lower()
    for k, v in pack.furniture.items():
        if k in name:
            return v
    return english


def generate_local_section(boq: BOQ, city: str | None = None) -> str:
    """Plain-text carpenter spec in the city's local language.

    Same overall layout as the old Hindi-only version — header banner, one
    numbered block per build item with material/joinery/edge/hardware
    callouts, then a general-instructions block. The carpenter prints this,
    photographs it, or forwards it on WhatsApp — so it must read cleanly
    without any formatting beyond what monospace text supports.
    """
    build_lines = [l for l in boq.furniture if l.procurement == "build"]
    if not build_lines:
        return ""

    pack = lang_for_city(city)
    out: list[str] = []
    out.append("===========================================")
    out.append(f"  {pack.spec_title}")
    out.append(f"  ({pack.spec_subtitle_en})")
    out.append("===========================================")
    out.append("")
    for idx, line in enumerate(build_lines, start=1):
        local_name = to_local_name(line.description, pack)
        out.append(f"{idx}. {local_name}  ({line.description})")
        if line.carpenter_spec:
            for spec_line in pack.material_lines:
                out.append(f"   {spec_line}")
        out.append(f"   {pack.price_label} {line.amount_inr:,}")
        out.append("")
    out.append("===========================================")
    out.append(f"  {pack.general_title} ({pack.general_subtitle_en})")
    out.append("===========================================")
    out.append("")
    for n, gline in enumerate(pack.general_lines, start=1):
        out.append(f"{n}. {gline}")
    out.append("")
    return "\n".join(out)


def language_info(city: str | None) -> dict[str, str]:
    """Frontend metadata describing the language used for the carpenter
    section. Returned alongside the spec text in the /export response so the
    UI can label the heading correctly (e.g. 'Marathi Specification · …')."""
    pack = lang_for_city(city)
    return {
        "code": pack.code,
        "name_en": pack.name_en,
        "name_native": pack.name_native,
        "heading_en": pack.section_heading_en,
        "heading_native": pack.section_heading_native,
    }
