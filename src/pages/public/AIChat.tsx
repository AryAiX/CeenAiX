import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { Send, User, Bot, Calendar, Sparkles } from 'lucide-react';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { useAuth } from '../../lib/auth-context';
import { dateTimeFormatWithNumerals, resolveLocale } from '../../lib/i18n-ui';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: string[];
}

function buildWelcomeMessage(tf: TFunction): Message {
  const raw = tf('public.guestAiChat.welcomeSuggestions', { returnObjects: true });
  const suggestions = Array.isArray(raw) ? (raw as string[]) : [];
  return {
    id: 'welcome',
    role: 'assistant',
    content: tf('public.guestAiChat.welcomeMessage'),
    timestamp: new Date(),
    suggestions,
  };
}

function suggestionOpensFindDoctor(suggestion: string): boolean {
  const t = suggestion.trim();
  const lower = t.toLowerCase();
  return (
    /browse\s+all\s+doctors/i.test(lower) ||
    /view\s+doctors/i.test(lower) ||
    /^تصفح/.test(t) ||
    t.includes('جميع الأطباء')
  );
}

export const AIChat: React.FC = () => {
  const { t, i18n } = useTranslation('common');
  const { role } = useAuth();
  const isDoctor = role === 'doctor';
  const uiLang = i18n.language ?? 'en';
  const locale = resolveLocale(uiLang);
  const dtOpts = (options: Intl.DateTimeFormatOptions) => dateTimeFormatWithNumerals(uiLang, options);
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversationContextRef = useRef<string[]>([]);
  const welcomeMessage = useMemo(() => buildWelcomeMessage(t), [t]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    setMessages((prev) => {
      const userHasChatted = prev.some((m) => m.role === 'user');
      if (userHasChatted) {
        return prev;
      }
      if (prev.length === 0) {
        return [welcomeMessage];
      }
      if (prev.length === 1 && prev[0].id === 'welcome') {
        return [
          {
            ...welcomeMessage,
            timestamp: prev[0].timestamp,
          },
        ];
      }
      return prev;
    });
  }, [welcomeMessage]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const generateResponse = (userInput: string): { content: string; suggestions?: string[] } => {
    const input = userInput.toLowerCase();
    const context = conversationContextRef.current.join(' ').toLowerCase();

    // Add current input to context
    conversationContextRef.current.push(userInput);
    // Keep only last 10 messages for context
    if (conversationContextRef.current.length > 10) {
      conversationContextRef.current.shift();
    }

    // Greetings
    if (input.match(/^(hi|hello|hey|good morning|good afternoon|good evening|greetings)/)) {
      return {
        content: "Hello! I'm here to help with your health questions. I can assist you with:\n\n• Symptom assessment and guidance\n• Finding the right doctor or specialist\n• Understanding medical conditions\n• Wellness and prevention tips\n• Emergency guidance\n• Mental health support\n\nWhat brings you here today?",
        suggestions: ['I have symptoms', 'Find a doctor', 'General health question', 'Wellness tips'],
      };
    }

    // Thank you
    if (input.match(/thank/)) {
      return {
        content: "You're welcome! I'm always here to help with your health concerns. Remember, while I provide helpful information, it's important to consult with healthcare professionals for medical decisions.\n\nIs there anything else I can help you with?",
        suggestions: ['Find a doctor', 'Ask another question', 'Book appointment', 'I\'m done'],
      };
    }

    // Follow-up questions with context
    if ((input.includes('how long') || input.includes('when will') || input.includes('duration')) && context.length > 0) {
      if (context.includes('symptom') || context.includes('pain') || context.includes('sick')) {
        return {
          content: "The duration depends on the underlying cause:\n\n**General Guidelines:**\n• Common cold: 7-10 days\n• Flu: 1-2 weeks\n• Minor injuries: Days to weeks depending on severity\n• Chronic conditions: Require ongoing management\n\n**Important:**\n• If symptoms worsen or don't improve as expected, see a doctor\n• Some conditions need immediate attention regardless of duration\n• Early treatment often leads to faster recovery\n\n**When to be concerned:**\n• Symptoms lasting longer than expected\n• Getting worse instead of better\n• New symptoms developing\n• Severe symptoms at any point\n\nWould you like specific information about your concern?",
          suggestions: ['Find a doctor', 'Specific symptom', 'Emergency guidance', 'More questions'],
        };
      }
    }

    // "Should I see a doctor" type questions
    if (input.includes('should i see') || input.includes('do i need') || input.includes('when to see') || input.includes('go to doctor')) {
      return {
        content: "Here's guidance on when to seek medical care:\n\n**See a doctor if:**\n• Symptoms are severe or worsening\n• Symptoms persist beyond expected duration\n• You have concerning symptoms (chest pain, difficulty breathing, severe pain)\n• Symptoms interfere with daily activities\n• You have underlying health conditions\n• You're unsure or worried\n\n**Urgent care for:**\n• Non-life-threatening but need same-day care\n• Minor injuries or illnesses\n• After-hours when doctor's office is closed\n\n**Emergency room (or call 911) for:**\n• Chest pain or pressure\n• Difficulty breathing\n• Severe bleeding\n• Loss of consciousness\n• Stroke symptoms\n• Severe allergic reaction\n\n**Remember:**\nIt's always better to err on the side of caution. If you're worried, get evaluated. Trust your instincts about your body.\n\nWould you like help finding a doctor or urgent care facility?",
        suggestions: ['Find a doctor', 'Find urgent care', 'Emergency info', 'Describe symptoms'],
      };
    }

    // Pain-related queries
    if (input.includes('pain') && !input.includes('head')) {
      const bodyPart = input.match(/(chest|stomach|back|knee|joint|muscle|abdomen|leg|arm|neck|shoulder)/)?.[0] || 'body';
      return {
        content: `I understand you're experiencing ${bodyPart} pain. Pain assessment is important for proper care.\n\n**Important Questions:**\n• When did the pain start?\n• Is it sharp, dull, or throbbing?\n• Does it come and go or is it constant?\n• What makes it better or worse?\n\n**Seek immediate care if:**\n• Pain is severe or sudden\n• Accompanied by fever, swelling, or redness\n• Difficulty moving or breathing\n• Pain after an injury\n\n**General relief:**\n• Rest the affected area\n• Apply ice (first 48 hours) or heat\n• Over-the-counter pain relief if appropriate\n• Avoid activities that worsen pain\n\nWould you like help finding a specialist to evaluate this?`,
        suggestions: ['Find specialist', 'Emergency care', 'Tell me more', 'Other symptoms'],
      };
    }

    // Headache
    if (input.includes('headache') || input.includes('head pain') || input.includes('migraine')) {
      return {
        content: "I understand you're experiencing a headache. Let me help you assess this:\n\n**Common causes:**\n• Tension or stress\n• Dehydration\n• Eye strain from screens\n• Lack of sleep\n• Caffeine withdrawal\n• Migraines (recurring, often with nausea/light sensitivity)\n\n**When to see a doctor:**\n• Worst headache of your life (sudden, severe)\n• Accompanied by fever, stiff neck, or vision changes\n• After a head injury\n• Lasting more than a few days\n• Getting progressively worse\n• New headaches after age 50\n\n**Immediate relief:**\n• Rest in a quiet, dark room\n• Stay hydrated\n• Apply a cold compress\n• Gentle neck stretches\n• Over-the-counter pain relief if appropriate\n\nWould you like me to help you find a neurologist or general practitioner?",
        suggestions: ['Find a neurologist', 'Find a GP', 'Other symptoms', 'Emergency care'],
      };
    }

    // Cold, flu, COVID symptoms
    if (input.includes('cold') || input.includes('flu') || input.includes('cough') || input.includes('covid') || input.includes('coronavirus')) {
      return {
        content: "Respiratory symptoms can have various causes. Let me help you understand:\n\n**Common Symptoms:**\n• Cold: Runny nose, sneezing, mild cough\n• Flu: Fever, body aches, fatigue, cough\n• COVID-19: Fever, cough, loss of taste/smell, fatigue\n\n**Self-care:**\n• Rest and stay hydrated\n• Over-the-counter symptom relief\n• Isolate to prevent spread\n• Monitor symptoms\n\n**See a doctor if:**\n• Difficulty breathing or shortness of breath\n• High fever (>103°F / 39.4°C)\n• Symptoms worsen after improving\n• Chest pain or pressure\n• Confusion or severe dizziness\n• Symptoms last more than 10 days\n\n**COVID-19 Testing:**\nConsider testing if you have symptoms or exposure. Many doctors offer telehealth visits for assessment.\n\nWould you like help finding a doctor or testing location?",
        suggestions: ['Find a doctor', 'Telehealth visit', 'Testing locations', 'Monitor at home'],
      };
    }

    // Fever
    if (input.includes('fever') || input.includes('temperature') || input.includes('hot')) {
      return {
        content: "Fever can be a sign your body is fighting an infection. Here's what you should know:\n\n**Temperature Guide:**\n• Normal: 97-99°F (36-37°C)\n• Low-grade fever: 100-102°F (37.8-39°C)\n• High fever: Above 103°F (39.4°C)\n\n**Normal response if:**\n• Temperature is below 102°F (39°C)\n• You have other cold/flu symptoms\n• It responds to medication\n• You feel relatively okay otherwise\n\n**See a doctor if:**\n• Temperature above 103°F (39.4°C)\n• Lasts more than 3 days\n• Accompanied by severe headache, rash, or difficulty breathing\n• You have a weakened immune system\n• Infant under 3 months with any fever\n• Seizures or confusion\n\n**Self-care:**\n• Rest and stay hydrated\n• Take fever-reducing medication (acetaminophen or ibuprofen) if appropriate\n• Monitor your temperature every 4-6 hours\n• Light clothing and room temperature environment\n\nShould I help you find a doctor for evaluation?",
        suggestions: ['Find a doctor now', 'Emergency care', 'More questions', 'Monitor at home'],
      };
    }

    if (input.includes('find') && (input.includes('doctor') || input.includes('specialist'))) {
      return {
        content: "I can help you find the right healthcare professional! Our platform has:\n\n• **General Practitioners** - for routine care and checkups\n• **Specialists** - cardiologists, dermatologists, orthopedic surgeons, and more\n• **Video Consultations** - available for many doctors\n• **Same-day appointments** - often available\n\nWhat type of specialist are you looking for, or would you like to browse all available doctors?",
        suggestions: ['Browse all doctors', 'Cardiologist', 'Dermatologist', 'Pediatrician'],
      };
    }

    if (input.includes('appointment') || input.includes('book')) {
      return {
        content: "Great! I can help you book an appointment. Here's how it works:\n\n**Quick & Easy Process:**\n1. Browse our verified doctors\n2. Check available time slots\n3. Choose in-person or video consultation\n4. Confirm your booking\n\nYou can book appointments instantly with most of our doctors. Would you like to see available doctors now?",
        suggestions: ['View doctors', 'Video consultations', 'Emergency care', 'Ask another question'],
      };
    }

    // Allergies
    if (input.includes('allergy') || input.includes('allergic') || input.includes('sneez') || input.includes('itchy eyes')) {
      return {
        content: "Allergies affect millions of people. Here's what you should know:\n\n**Common Allergens:**\n• Pollen (seasonal allergies)\n• Dust mites\n• Pet dander\n• Mold\n• Food allergens\n• Insect stings\n\n**Mild Allergy Symptoms:**\n• Sneezing, runny nose\n• Itchy, watery eyes\n• Mild skin rash\n• Nasal congestion\n\n**Management:**\n• Identify and avoid triggers\n• Over-the-counter antihistamines\n• Nasal sprays\n• Keep windows closed during high pollen\n• Use air purifiers\n\n**See a doctor if:**\n• Symptoms interfere with daily life\n• Over-the-counter medications don't help\n• Want allergy testing\n• Considering immunotherapy\n\n**EMERGENCY - Seek immediate help if:**\n• Difficulty breathing or swallowing\n• Swelling of face, lips, or tongue\n• Rapid pulse with dizziness\n• These are signs of anaphylaxis - call 911\n\nWould you like to find an allergist or discuss treatment options?",
        suggestions: ['Find allergist', 'Allergy testing', 'Emergency care', 'Management tips'],
      };
    }

    // Pregnancy related
    if (input.includes('pregnan') || input.includes('expecting') || input.includes('baby')) {
      return {
        content: "Pregnancy is an exciting time! Here's important health information:\n\n**Prenatal Care:**\n• Schedule first appointment at 8 weeks\n• Regular checkups throughout pregnancy\n• Prenatal vitamins with folic acid\n• Healthy diet and appropriate exercise\n• Avoid alcohol, smoking, certain medications\n\n**When to call your doctor:**\n• Vaginal bleeding\n• Severe abdominal pain\n• Decreased fetal movement (after 28 weeks)\n• Severe headache with vision changes\n• Signs of preterm labor\n• Persistent vomiting\n\n**Emergency signs:**\n• Severe bleeding\n• Water breaks before 37 weeks\n• Severe abdominal pain\n• High fever\n• Sudden swelling with headache\n\n**Finding Care:**\n• OB/GYN for pregnancy care\n• Midwife for lower-risk pregnancies\n• High-risk specialist if needed\n\nWould you like help finding an OB/GYN or midwife?",
        suggestions: ['Find OB/GYN', 'Find midwife', 'Pregnancy tips', 'Emergency info'],
      };
    }

    // Children/pediatric
    if (input.includes('child') || input.includes('kid') || input.includes('baby') || input.includes('infant') || input.includes('toddler')) {
      return {
        content: "Children's health needs special attention. Here's guidance:\n\n**Well-Child Care:**\n• Regular checkups and vaccinations\n• Growth and development monitoring\n• Anticipatory guidance for parents\n\n**Common Concerns:**\n• Fever in infants: Any fever in baby under 3 months needs immediate evaluation\n• Ear infections: Pain, fever, tugging at ear\n• Rashes: Many are viral and harmless, but some need evaluation\n• Cough/cold: Common but watch for breathing difficulties\n\n**When to call pediatrician:**\n• Fever over 100.4°F (38°C) in infant under 3 months\n• Fever over 104°F (40°C) at any age\n• Difficulty breathing\n• Severe pain\n• Not drinking fluids\n• Unusual lethargy or irritability\n• Rash with fever\n\n**Emergency (Call 911):**\n• Difficulty breathing\n• Unresponsive or very difficult to wake\n• Seizure (first time or lasting >5 minutes)\n• Signs of severe allergic reaction\n\nWould you like help finding a pediatrician?",
        suggestions: ['Find pediatrician', 'Emergency care', 'Well-child visits', 'Specific symptom'],
      };
    }

    // Injury related
    if (input.includes('injury') || input.includes('hurt') || input.includes('broke') || input.includes('sprain') || input.includes('cut') || input.includes('burn')) {
      return {
        content: "Injuries need prompt and appropriate care. Here's what to do:\n\n**Minor Injuries:**\n• Cuts: Clean, apply pressure, bandage\n• Minor burns: Cool water, don't use ice\n• Sprains: RICE (Rest, Ice, Compression, Elevation)\n• Bruises: Ice pack, elevation\n\n**See a doctor if:**\n• Deep cut that may need stitches\n• Can't move or bear weight on injured area\n• Severe pain or swelling\n• Numbness or tingling\n• Signs of infection (warmth, redness, pus)\n• Burn larger than 3 inches or on face/hands/joints\n\n**Go to ER or call 911:**\n• Suspected broken bone\n• Head injury with loss of consciousness\n• Severe bleeding that won't stop\n• Burn with blistering over large area\n• Injury from significant fall or accident\n• Chest or abdominal injury\n• Any injury with severe pain\n\n**Tetanus:**\nEnsure tetanus shot is up to date (every 10 years, or 5 years for dirty wounds).\n\nNeed help finding urgent care or orthopedic specialist?",
        suggestions: ['Find urgent care', 'Find orthopedic', 'Emergency room', 'First aid info'],
      };
    }

    // Wellness and prevention
    if (input.includes('wellness') || input.includes('health tips') || input.includes('prevention') || input.includes('healthy') || input.includes('nutrition') || input.includes('exercise')) {
      return {
        content: "Here are evidence-based wellness tips for optimal health:\n\n**Daily Habits:**\n• **Sleep**: 7-9 hours for adults, consistent schedule\n• **Hydration**: 8-10 glasses of water daily\n• **Exercise**: 150 minutes moderate activity per week\n• **Diet**: Colorful fruits/vegetables, whole grains, lean protein\n• **Stress**: Regular breaks, mindfulness, hobbies\n\n**Preventive Care:**\n• Annual physical exam\n• Age-appropriate screenings (blood pressure, cholesterol, cancer screenings)\n• Keep vaccinations up to date\n• Dental checkups twice yearly\n• Vision exam every 1-2 years\n\n**Nutrition Tips:**\n• Eat the rainbow (variety of colored produce)\n• Limit processed foods and added sugars\n• Portion control\n• Don't skip breakfast\n\n**Exercise Ideas:**\n• Walking, swimming, cycling\n• Strength training 2x per week\n• Flexibility and balance exercises\n• Find activities you enjoy\n\n**Warning Signs to Watch:**\n• Unexplained weight changes\n• Persistent fatigue\n• Changes in appetite or sleep patterns\n• New or changing symptoms\n\nWould you like specific tips for any health area?",
        suggestions: ['Nutrition advice', 'Exercise plan', 'Mental wellness', 'Schedule checkup'],
      };
    }

    if (input.includes('emergency') || input.includes('urgent') || input.includes('911')) {
      return {
        content: "**IMPORTANT: For life-threatening emergencies, call 911 immediately.**\n\nSeek emergency care if you experience:\n• Chest pain or pressure\n• Difficulty breathing\n• Severe bleeding\n• Loss of consciousness\n• Severe allergic reaction\n• Stroke symptoms (face drooping, arm weakness, speech difficulty)\n\nFor urgent but non-emergency care, I can help you:\n• Find urgent care clinics nearby\n• Connect with on-call doctors\n• Schedule same-day appointments\n\nIs this a medical emergency requiring 911?",
        suggestions: ['Find urgent care', 'Same-day appointment', 'Not an emergency', 'Continue chat'],
      };
    }

    if (input.includes('medication') || input.includes('medicine') || input.includes('prescription')) {
      return {
        content: "I can provide general information about medications, but remember:\n\n**Important:**\n• Always follow your doctor's prescription\n• Never share medications\n• Report side effects to your healthcare provider\n• Check for drug interactions\n\n**Common Questions:**\n• Take medications at the same time daily\n• Store as directed (temperature, light)\n• Don't skip doses without consulting your doctor\n• Keep a list of all medications you take\n\nFor prescription needs, I recommend:\n• Consulting with a doctor\n• Using our pharmacy finder\n• Setting up medication reminders\n\nWhat specific medication information do you need?",
        suggestions: ['Find pharmacy', 'Talk to doctor', 'Side effects info', 'Refill prescription'],
      };
    }

    // Digestive issues
    if (input.includes('stomach') || input.includes('nausea') || input.includes('vomit') || input.includes('diarrhea') || input.includes('constipation') || input.includes('indigestion')) {
      return {
        content: "Digestive issues are common and usually resolve on their own. Here's guidance:\n\n**Common Causes:**\n• Food poisoning or stomach virus\n• Dietary triggers\n• Stress\n• Medications\n• Food intolerance\n\n**Self-care:**\n• Stay hydrated (small sips frequently)\n• Bland diet (BRAT: bananas, rice, applesauce, toast)\n• Rest your digestive system\n• Avoid dairy, caffeine, and fatty foods temporarily\n\n**See a doctor if:**\n• Severe abdominal pain\n• Blood in stool or vomit\n• Signs of dehydration (dark urine, dizziness, dry mouth)\n• High fever\n• Symptoms last more than 2-3 days\n• Unable to keep fluids down\n\n**When it's urgent:**\n• Severe pain that prevents standing upright\n• Rapid heart rate with dizziness\n• Vomiting blood\n\nWould you like help finding a gastroenterologist or general practitioner?",
        suggestions: ['Find specialist', 'Emergency care', 'Dietary advice', 'More symptoms'],
      };
    }

    // Skin issues
    if (input.includes('rash') || input.includes('skin') || input.includes('itch') || input.includes('acne') || input.includes('eczema')) {
      return {
        content: "Skin conditions can have many causes. Let me help you understand:\n\n**Common Skin Issues:**\n• Rashes: Allergic reactions, infections, irritation\n• Acne: Hormones, bacteria, clogged pores\n• Eczema: Dry, itchy, inflamed skin\n• Contact dermatitis: Reaction to substances\n\n**General care:**\n• Keep area clean and dry\n• Avoid scratching\n• Use gentle, fragrance-free products\n• Moisturize regularly\n• Avoid known triggers\n\n**See a dermatologist if:**\n• Rash spreading rapidly\n• Signs of infection (warmth, pus, fever)\n• Severe itching affecting sleep\n• Not improving with over-the-counter treatments\n• Concerns about skin changes or moles\n\n**Seek immediate care if:**\n• Difficulty breathing with rash (possible allergic reaction)\n• Rash with fever and stiff neck\n• Painful blisters covering large areas\n\nWould you like to find a dermatologist?",
        suggestions: ['Find dermatologist', 'Skin care tips', 'Emergency care', 'Other concerns'],
      };
    }

    // Sleep issues
    if (input.includes('sleep') || input.includes('insomnia') || input.includes('tired') || input.includes('fatigue')) {
      return {
        content: "Sleep is crucial for overall health. Let me help with your sleep concerns:\n\n**Common Sleep Issues:**\n• Difficulty falling asleep\n• Waking during the night\n• Not feeling rested\n• Excessive daytime sleepiness\n\n**Sleep Hygiene Tips:**\n• Consistent sleep schedule (same time daily)\n• Cool, dark, quiet bedroom\n• Avoid screens 1 hour before bed\n• Limit caffeine after 2 PM\n• Regular exercise (but not close to bedtime)\n• Relaxation techniques before bed\n\n**When to see a doctor:**\n• Chronic insomnia (3+ nights/week for 3+ months)\n• Snoring with pauses in breathing\n• Extreme daytime fatigue affecting function\n• Legs twitching or urge to move at night\n• Falling asleep during activities\n\n**Consider:**\n• Sleep study for sleep apnea concerns\n• Mental health evaluation if stress/anxiety related\n\nWould you like help finding a sleep specialist or discussing this with a doctor?",
        suggestions: ['Find sleep specialist', 'Sleep tips', 'Mental health support', 'General consultation'],
      };
    }

    // Mental health
    if (input.includes('mental health') || input.includes('anxiety') || input.includes('depression') || input.includes('stress') || input.includes('sad') || input.includes('worried') || input.includes('panic')) {
      return {
        content: "Your mental health matters just as much as physical health. I'm here to help:\n\n**Common Feelings:**\n• Stress and anxiety are normal responses to life challenges\n• Many people experience these challenges\n• Help is available and treatment is effective\n• You're not alone\n\n**When to Seek Help:**\n• Feelings interfere with daily life, work, or relationships\n• Lasting more than 2 weeks\n• Panic attacks or overwhelming fear\n• Thoughts of self-harm or suicide\n• Significant changes in sleep, appetite, or energy\n• Loss of interest in activities you once enjoyed\n\n**CRISIS SUPPORT (24/7):**\n• **988 Suicide & Crisis Lifeline**: Call or text 988\n• **Crisis Text Line**: Text HOME to 741741\n• **Emergency**: Call 911 if immediate danger\n\n**Professional Help:**\nI can connect you with:\n• Licensed therapists (talk therapy)\n• Psychiatrists (medication management)\n• Support groups\n• Telehealth mental health services\n\n**Self-care while seeking help:**\n• Reach out to trusted friends/family\n• Maintain routine (sleep, meals, exercise)\n• Mindfulness and breathing exercises\n• Limit alcohol and substances\n\nWould you like help finding a mental health professional?",
        suggestions: ['Find therapist', 'Find psychiatrist', 'Coping strategies', 'Crisis support'],
      };
    }

    // Chronic conditions
    if (input.includes('diabetes') || input.includes('blood sugar') || input.includes('hypertension') || input.includes('high blood pressure') || input.includes('asthma') || input.includes('arthritis')) {
      return {
        content: "Managing chronic conditions requires ongoing care. Here's helpful information:\n\n**Chronic Condition Management:**\n• Regular monitoring and checkups\n• Medication adherence\n• Lifestyle modifications\n• Track symptoms and triggers\n• Build a care team\n\n**Key Specialists:**\n• Endocrinologist (diabetes, thyroid)\n• Cardiologist (heart, blood pressure)\n• Pulmonologist (asthma, lung conditions)\n• Rheumatologist (arthritis, autoimmune)\n\n**Self-Management:**\n• Keep medication list updated\n• Monitor relevant metrics (blood sugar, blood pressure, etc.)\n• Healthy diet and regular exercise\n• Stress management\n• Join support groups\n\n**When to contact your doctor:**\n• Symptoms worsening\n• Medication side effects\n• New symptoms\n• Difficulty managing condition\n• Questions about treatment\n\nWould you like help finding a specialist for your condition?",
        suggestions: ['Find specialist', 'Management tips', 'Support groups', 'General questions'],
      };
    }

    // Lab tests and results
    if (input.includes('test') || input.includes('lab') || input.includes('blood work') || input.includes('screening')) {
      return {
        content: "Medical tests and screenings are important for diagnosis and prevention:\n\n**Common Tests:**\n• Blood work (CBC, metabolic panel, lipids)\n• Urinalysis\n• Imaging (X-ray, CT, MRI, ultrasound)\n• Cancer screenings (mammogram, colonoscopy, etc.)\n\n**Understanding Results:**\n• Always review results with your doctor\n• Ask about what abnormal values mean\n• Discuss next steps if needed\n• Get copies for your records\n\n**Preparing for Tests:**\n• Follow fasting instructions if given\n• List all medications you take\n• Bring insurance card and ID\n• Ask about preparation requirements\n\n**Age-Appropriate Screenings:**\n• Blood pressure: Regular checks for all adults\n• Cholesterol: Starting at age 20\n• Diabetes: Age 35 or earlier if risk factors\n• Cancer screenings: Based on age and risk factors\n\nNeed help finding a lab or scheduling tests?",
        suggestions: ['Find laboratory', 'Screening schedule', 'Test preparation', 'Understanding results'],
      };
    }

    // Vaccination
    if (input.includes('vaccin') || input.includes('immunization') || input.includes('shot')) {
      return {
        content: "Vaccinations are crucial for preventing serious diseases:\n\n**Adult Vaccinations:**\n• Annual flu vaccine\n• COVID-19 vaccine and boosters\n• Tetanus/Diphtheria (Td) every 10 years\n• Shingles vaccine (age 50+)\n• Pneumonia vaccine (age 65+ or if risk factors)\n\n**Child Vaccinations:**\n• Follow CDC recommended schedule\n• Protects against measles, polio, whooping cough, and more\n• Safe and effective\n\n**Travel Vaccinations:**\nDepending on destination, may need vaccines for:\n• Hepatitis A and B\n• Typhoid\n• Yellow fever\n• Others based on travel location\n\n**Common Concerns:**\n• Vaccines are thoroughly tested for safety\n• Mild side effects (soreness, low fever) are normal\n• Benefits far outweigh risks\n• Herd immunity protects vulnerable populations\n\n**Where to Get Vaccinated:**\n• Doctor's office\n• Pharmacies\n• Health departments\n• Urgent care clinics\n\nWould you like help finding vaccination services?",
        suggestions: ['Find vaccination', 'Vaccine schedule', 'Travel vaccines', 'Vaccine safety'],
      };
    }

    // Women's health
    if (input.includes('period') || input.includes('menstrual') || input.includes('pap smear') || input.includes('mammogram') || input.includes('gynecolog')) {
      return {
        content: "Women's health requires specialized care. Here's important information:\n\n**Routine Care:**\n• Annual well-woman exam\n• Pap smear (ages 21-65, every 3-5 years depending on age)\n• Mammogram (starting age 40-50, annually or biennially)\n• Bone density screening (age 65+)\n\n**Menstrual Health:**\n• Normal cycle: 21-35 days\n• Period: 2-7 days\n• See doctor if: Very heavy bleeding, severe pain, irregular cycles, bleeding between periods\n\n**Birth Control:**\n• Many options available\n• Discuss with healthcare provider to find best fit\n• Consider health history and lifestyle\n\n**Menopause:**\n• Average age 51, but varies\n• Symptoms: Hot flashes, mood changes, sleep issues\n• Treatment options available\n\n**When to see gynecologist:**\n• Annual checkups\n• Abnormal bleeding\n• Pelvic pain\n• Concerns about fertility\n• Menopause symptoms\n\nWould you like help finding a gynecologist?",
        suggestions: ['Find gynecologist', 'Women\'s health', 'Preventive care', 'Specific concern'],
      };
    }

    // Men's health
    if (input.includes('prostate') || input.includes('erectile') || input.includes('testosterone') || input.includes('men\'s health')) {
      return {
        content: "Men's health includes specific screenings and concerns:\n\n**Routine Care:**\n• Annual physical exam\n• Blood pressure and cholesterol screening\n• Prostate cancer screening (discuss at age 50, or 45 if high risk)\n• Testicular self-exam monthly\n• Colon cancer screening (age 45+)\n\n**Common Concerns:**\n• Prostate health (BPH, prostatitis, cancer)\n• Erectile dysfunction (often treatable)\n• Low testosterone\n• Heart health\n• Mental health\n\n**When to see a doctor:**\n• Difficulty urinating\n• Sexual health concerns\n• Unusual lumps or changes\n• Persistent fatigue or mood changes\n• Chest pain or shortness of breath\n\n**Preventive Health:**\n• Maintain healthy weight\n• Regular exercise\n• Balanced diet\n• Limit alcohol\n• Don't smoke\n• Manage stress\n\n**Important:**\nMany men avoid healthcare until problems become serious. Regular checkups can catch issues early.\n\nWould you like help finding a primary care doctor or urologist?",
        suggestions: ['Find doctor', 'Men\'s screening', 'Specific concern', 'Preventive care'],
      };
    }

    // Default response with helpful guidance
    return {
      content: "I understand your concern. Based on what you've shared, here's my recommendation:\n\n**Next Steps:**\n• Consider scheduling a consultation with a healthcare professional for proper evaluation\n• Keep track of any symptoms and when they occur\n• Note any triggers or patterns you notice\n• Document questions to ask your doctor\n\n**I Can Help You:**\n• Find the right specialist for your needs\n• Book an appointment quickly\n• Answer more specific health questions\n• Provide general wellness guidance\n• Connect you with emergency care if needed\n\n**Tips for Better Care:**\n• Be specific about your symptoms (when, how often, severity)\n• List all medications and supplements you take\n• Share relevant family health history\n• Don't hesitate to ask questions\n\nWhat would be most helpful for you right now?",
      suggestions: ['Find a doctor', 'Describe symptoms', 'Emergency guidance', 'Ask another question'],
    };
  };

  const replyTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (replyTimeoutRef.current !== null) {
        window.clearTimeout(replyTimeoutRef.current);
      }
    };
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsTyping(true);

    if (replyTimeoutRef.current !== null) {
      window.clearTimeout(replyTimeoutRef.current);
    }

    replyTimeoutRef.current = window.setTimeout(() => {
      const { content, suggestions } = generateResponse(currentInput);
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content,
        timestamp: new Date(),
        suggestions,
      };
      setMessages((prev) => [...prev, aiResponse]);
      setIsTyping(false);
      replyTimeoutRef.current = null;
    }, 1000 + Math.random() * 1000);
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (suggestionOpensFindDoctor(suggestion)) {
      navigate('/find-doctor');
      return;
    }
    setInput(suggestion);
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-b from-slate-50 via-white to-white">
      <div className="absolute inset-0 z-0 opacity-5">
        <img
          src="https://images.pexels.com/photos/8438971/pexels-photo-8438971.jpeg?auto=compress&cs=tinysrgb&w=1920"
          alt={t('public.guestAiChat.heroAlt')}
          className="w-full h-full object-cover"
        />
      </div>
      <Header />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-8">
        <div className="mb-6 flex items-start space-x-3 rounded-[2rem] border border-cyan-200 bg-white/95 p-5 shadow-sm backdrop-blur">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-cyan-50">
            <Sparkles className="h-5 w-5 text-ceenai-blue" />
          </div>
          <div className="flex-1">
            <h3 className="mb-1 text-sm font-semibold text-slate-900">
              {isDoctor ? t('public.guestAiChat.doctorBannerTitle') : t('public.guestAiChat.assistantTitle')}
            </h3>
            {isDoctor ? (
              <p className="text-sm text-slate-600">
                {t('public.guestAiChat.doctorBannerBody')}{' '}
                <button
                  type="button"
                  onClick={() => navigate('/doctor/dashboard')}
                  className="font-semibold text-ceenai-blue underline hover:text-ceenai-blue-dark"
                >
                  {t('public.guestAiChat.doctorOpenPortal')}
                </button>
              </p>
            ) : (
              <p className="text-sm text-slate-600">
                {t('public.guestAiChat.assistantLead')}{' '}
                <button
                  type="button"
                  onClick={() => navigate('/auth')}
                  className="font-semibold text-ceenai-blue underline hover:text-ceenai-blue-dark"
                >
                  {t('public.guestAiChat.createAccountCta')}
                </button>
                {t('public.guestAiChat.assistantTrail')}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-950 px-6 py-5">
            <div className="flex items-center space-x-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
                <Bot className="h-6 w-6 text-cyan-300" />
              </div>
              <div>
                <h2 className="font-semibold text-white">{t('public.guestAiChat.chatTitle')}</h2>
                <p className="text-xs text-slate-300">{t('public.guestAiChat.chatTagline')}</p>
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-6 overflow-y-auto bg-gradient-to-b from-slate-50/70 to-white p-6">
            {messages.map((message) => (
              <div key={message.id} className="animate-fade-in">
                <div
                  className={`flex items-start space-x-3 ${
                    message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl shadow-sm ${
                      message.role === 'user'
                        ? 'bg-gradient-to-br from-ceenai-blue to-ceenai-navy'
                        : 'bg-gradient-to-br from-cyan-100 to-blue-100'
                    }`}
                  >
                    {message.role === 'user' ? (
                      <User className="h-5 w-5 text-white" />
                    ) : (
                      <Bot className="h-5 w-5 text-ceenai-blue" />
                    )}
                  </div>
                  <div className="flex-1 max-w-2xl">
                    <div
                      className={`rounded-[1.5rem] px-5 py-4 shadow-sm ${
                        message.role === 'user'
                          ? 'bg-gradient-to-br from-ceenai-blue to-ceenai-navy text-white'
                          : 'border border-slate-200 bg-white text-slate-900'
                      }`}
                    >
                      <p className="whitespace-pre-line text-sm leading-relaxed">{message.content}</p>
                      <p
                        className={`text-xs mt-2 ${
                          message.role === 'user' ? 'text-blue-100' : 'text-slate-400'
                        }`}
                      >
                        {message.timestamp.toLocaleTimeString(
                          locale,
                          dtOpts({
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        )}
                      </p>
                    </div>
                    {message.suggestions && message.suggestions.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {message.suggestions.map((suggestion, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="rounded-full border border-cyan-200 bg-cyan-50 px-4 py-2 text-xs font-medium text-cyan-800 transition-all hover:bg-cyan-100 hover:shadow-sm"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex items-start space-x-3 animate-fade-in">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-100 to-blue-100 shadow-sm">
                  <Bot className="h-5 w-5 text-ceenai-blue" />
                </div>
                <div className="rounded-[1.5rem] border border-slate-200 bg-white px-5 py-3 shadow-sm">
                  <div className="flex space-x-2">
                    <div className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce"></div>
                    <div className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-slate-200 bg-white p-4 sm:p-6">
            <form onSubmit={handleSendMessage} className="flex items-end space-x-3">
              <div className="flex-1">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                  placeholder={t('public.guestAiChat.inputPlaceholder')}
                  rows={1}
                  className="w-full resize-none rounded-[1.5rem] border border-slate-200 bg-slate-50/70 px-4 py-3 outline-none transition focus:border-ceenai-cyan focus:bg-white focus:ring-2 focus:ring-ceenai-cyan/20"
                  style={{ minHeight: '48px', maxHeight: '120px' }}
                />
              </div>
              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                className="flex-shrink-0 rounded-2xl bg-gradient-to-r from-ceenai-cyan to-ceenai-blue p-3 text-white shadow-sm transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-slate-500">{t('public.guestAiChat.keyboardHint')}</p>
              <p className="text-xs text-slate-400">{t('public.guestAiChat.footerBrand')}</p>
            </div>
          </div>
        </div>

        {!isDoctor ? (
          <div className="mt-6 rounded-[2rem] bg-slate-950 p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Calendar className="h-6 w-6 text-cyan-300" />
                <div>
                  <p className="text-sm font-semibold text-white">{t('public.guestAiChat.ctaTitle')}</p>
                  <p className="text-xs text-slate-300">{t('public.guestAiChat.ctaSub')}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/find-doctor')}
                className="rounded-full bg-white px-6 py-2.5 font-semibold text-slate-950 transition-all hover:bg-slate-100"
              >
                {t('public.guestAiChat.findDoctors')}
              </button>
            </div>
          </div>
        ) : null}

        <p className="mt-4 px-4 text-center text-xs text-slate-500">{t('public.guestAiChat.disclaimer')}</p>
      </div>
      <Footer />
    </div>
  );
};
