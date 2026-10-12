import React, { useEffect, useMemo, useRef, useState } from "react";

type AppView = "today" | "coach" | "workout" | "warmup" | "analyze" | "history";
type WarmupArea = "Full body" | "Neck" | "Shoulders" | "Arms" | "Wrists" | "Hips" | "Legs" | "Ankles";
type IconName =
  | "arrow"
  | "calendar"
  | "check"
  | "chevron"
  | "clock"
  | "close"
  | "history"
  | "home"
  | "image"
  | "message"
  | "play"
  | "plus"
  | "send"
  | "spark"
  | "stopwatch"
  | "target"
  | "user"
  | "warmup"
  | "workout";

type WorkoutLog = {
  id: number;
  title: string;
  date: string;
  duration: string;
  grade: string;
  result: string;
};

type ChatMessage = { role: "coach" | "user"; text: string };
type AnalysisReport = {
  headline: string;
  overallScore: number;
  scores?: { category: string; score: number }[];
  biggestOpportunity?: { title: string; explanation: string; drill: string };
  moments?: { time: number; title: string; feedback: string }[];
  drills?: { name: string; instructions: string }[];
};
type SampledFrame = { time: number; image: string };

type WorkoutStep = {
  title: string;
  instructions: string;
  workLabel: string;
  workSeconds: number;
  restSeconds: number;
};

type WorkoutPlan = {
  title: string;
  duration: string;
  steps: WorkoutStep[];
};

type UserProfile = {
  name: string;
  email?: string;
  grade: string;
  note: string;
  height: string;
  armSpan: string;
  gender?: string;
  weight?: string;
  goals: string[];
  climbingYears?: string;
  climbingStyle?: string;
  climbingLocation?: string;
  experienceLevel?: string;
  fingerTrainingExperience?: string;
  targetGrade?: string;
  currentInjuries?: string;
  pastInjuries?: string;
  sessionsPerWeek?: string;
  trainingDays?: string[];
  sessionLength?: string;
  equipment?: string[];
  trainingStructure?: string;
  biggestChallenge?: string;
  failureResponse?: string;
};

const FONT_GRADES = [
  "3",
  "4",
  "5",
  "5+",
  "6A",
  "6A+",
  "6B",
  "6B+",
  "6C",
  "6C+",
  "7A",
  "7A+",
  "7B",
  "7B+",
  "7C",
  "7C+",
  "8A",
  "8A+",
  "8B",
  "8B+",
  "8C",
];

const WARMUPS: Record<WarmupArea, { title: string; time: string; note: string }[]> = {
  "Full body": [
    { title: "Pulse raiser", time: "3 min", note: "Easy jumping jacks, jogging in place, or a brisk walk." },
    { title: "World's greatest stretch", time: "2 min", note: "Move slowly through a lunge, rotation, and hamstring fold." },
    { title: "Easy climbing", time: "5 min", note: "Traverse or climb three very easy problems with quiet feet." },
  ],
  Neck: [
    { title: "Chin tucks", time: "10 reps", note: "Gently draw your chin straight back. Keep your gaze level." },
    { title: "Side tilts", time: "30 sec each", note: "Ear toward shoulder. No pulling — let gravity do the work." },
    { title: "Slow neck rotations", time: "60 sec", note: "Turn chin toward each shoulder through a comfortable range. Never force." },
  ],
  Shoulders: [
    { title: "Arm circles", time: "60 sec", note: "Build from small circles to full, controlled shoulder rotations." },
    { title: "Scapular pull-ups", time: "2 × 6", note: "Keep arms straight and move only through the shoulder blades." },
    { title: "Band pull-aparts", time: "2 × 10", note: "Use a light band and keep your ribs down." },
  ],
  Arms: [
    { title: "Tendon glides", time: "60 sec", note: "Move from open hand to hook, straight fist, then full fist." },
    { title: "Finger flicks", time: "45 sec", note: "Flick each finger open with control. Keep your forearms relaxed." },
    { title: "Easy open-hand hangs", time: "3 × 7 sec", note: "Feet supported. Use a large edge and stop well before fatigue." },
  ],
  Wrists: [
    { title: "Wrist circles", time: "45 sec", note: "Interlace your fingers and move through a comfortable range." },
    { title: "Palm pulses", time: "60 sec", note: "On all fours, gently shift weight forward over your hands." },
    { title: "Reverse palm stretch", time: "30 sec", note: "Turn fingers toward your knees and lean back very gently." },
  ],
  Hips: [
    { title: "90/90 switches", time: "60 sec", note: "Rotate side to side without forcing the end position." },
    { title: "Deep squat shifts", time: "60 sec", note: "Stay tall and shift gently between left and right." },
    { title: "High-step practice", time: "2 × 6", note: "Place a high foot and bring your hips over it with control." },
  ],
  Legs: [
    { title: "Quad stretch", time: "30 sec each", note: "Stand tall, pull your heel to your glute. Don't arch your back." },
    { title: "Calf raises", time: "2 × 12", note: "Rise slowly through the big toe and pause at the top." },
    { title: "Reverse lunges", time: "2 × 6", note: "Keep the front foot planted and move through a full range." },
  ],
  Ankles: [
    { title: "Ankle circles", time: "45 sec each", note: "Slow, controlled rotations. Trace a wide circle with your toes." },
    { title: "Ankle rocks", time: "60 sec", note: "Drive each knee over the toes while keeping your heel flat." },
    { title: "Single-leg balance", time: "30 sec each", note: "Stand on one foot and find a stable position before adding movement." },
  ],
};

const INTRO_SLIDES = [
  {
    id: "welcome",
    eyebrow: "Welcome to Bouldy",
    title: "Your personal AI\nbouldering coach",
    body: "Designed for boulderers who want to train smarter — not just harder.",
  },
  {
    id: "today",
    eyebrow: "Daily plan",
    title: "A personalized session,\nevery day",
    body: "Bouldy reads your history, grade, and goals to build today's training plan just for you.",
  },
  {
    id: "coach",
    eyebrow: "AI Coach",
    title: "Ask anything, get\nexpert guidance",
    body: "Stuck on a problem? Upload a photo or describe the move. Your coach responds instantly.",
  },
  {
    id: "workouts",
    eyebrow: "Workouts",
    title: "Structured training\nthat compounds",
    body: "Follow coach-built programs, track every send, and watch your progress build week by week.",
  },
  {
    id: "warmup",
    eyebrow: "Warm Up",
    title: "Protect your body,\nclimb longer",
    body: "Targeted routines for fingers, wrists, shoulders, and hips — built for climbers, by climbers.",
  },
];

const GOALS = [
  "Get stronger",
  "Better static movement",
  "Better dynamic movement",
  "Improve technique",
  "Feel good climbing",
  "Train hard",
  "Get ready for a competition",
  "Prepare for a trip",
  "Send a project",
];

const STARTER_HISTORY: WorkoutLog[] = [
  { id: 1, title: "Technique session", date: "Tuesday, 18 June", duration: "52 min", grade: "6B", result: "6 sends" },
  { id: 2, title: "Limit bouldering", date: "Saturday, 15 June", duration: "68 min", grade: "6B+", result: "2 projects" },
  { id: 3, title: "Movement mileage", date: "Wednesday, 12 June", duration: "44 min", grade: "6A+", result: "9 sends" },
];

const API = (import.meta.env.VITE_API_URL || "")
  .replace(/^(?!https?:\/\/)/i, "https://")
  .replace(/\/+$/, "");

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  const paths: Record<IconName, React.ReactNode> = {
    arrow: <><path d="M5 12h14" /><path d="m14 7 5 5-5 5" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m9 18 6-6-6-6" />,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    history: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5M12 7v5l3 2" /></>,
    home: <><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10M9 20v-6h6v6" /></>,
    image: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9" r="1.5" /><path d="m21 15-5-5L5 20" /></>,
    message: <><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" /><path d="M8 9h8M8 13h5" /></>,
    play: <path d="m8 5 11 7-11 7Z" />,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    send: <><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></>,
    spark: <><path d="m12 3 1.4 4.1L18 9l-4.6 1.9L12 15l-1.4-4.1L6 9l4.6-1.9Z" /><path d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7Z" /></>,
    stopwatch: <><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2 2M9 2h6M17.5 5.5 19 4" /></>,
    target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    warmup: <><path d="M7 20c-3-2-3-6 0-8 3-2 3-6 0-8M17 4c3 2 3 6 0 8-3 2-3 6 0 8" /><path d="M10 7h4M10 17h4" /></>,
    workout: <><path d="M6 7v10M3 10v4M18 7v10M21 10v4M6 12h12" /></>,
  };
  return <svg {...common}>{paths[name]}</svg>;
}

function Heading({ children, level = 2, className = "" }: { children: React.ReactNode; level?: number; className?: string }) {
  return <div role="heading" aria-level={level} className={`heading ${className}`}>{children}</div>;
}

function Button({ children, className = "", variant = "primary", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "icon" }) {
  return <button className={`button button-${variant} ${className}`} {...props}>{children}</button>;
}

function SlideVisual({ id }: { id: string }) {
  switch (id) {
    case "welcome":
      return (
        <svg viewBox="0 0 320 220" fill="none" aria-hidden>
          <defs>
            <radialGradient id="wg" cx="50%" cy="50%">
              <stop offset="0%" stopColor="#4e7d5b" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#18251c" stopOpacity="0" />
            </radialGradient>
          </defs>
          <ellipse cx="160" cy="112" rx="148" ry="104" fill="url(#wg)" />
          <ellipse cx="160" cy="112" rx="112" ry="78" fill="none" stroke="#a9bba3" strokeOpacity={0.18} strokeWidth={1} />
          <ellipse cx="160" cy="112" rx="76" ry="52" fill="none" stroke="#a9bba3" strokeOpacity={0.25} strokeWidth={1} />
          <ellipse cx="160" cy="112" rx="44" ry="30" fill="none" stroke="#a9bba3" strokeOpacity={0.35} strokeWidth={1} />
          <path d="M160 84c15-4 36 8 37 28s-15 38-37 38-37-16-37-38 22-32 37-28z" fill="#315c3d" />
          <path d="M160 90c10-2 24 5 25 22s-10 26-25 26-24-10-24-26 14-25 24-22z" fill="#223228" />
          <path d="M146 104c5-3 14-4 21-1" stroke="#a9bba3" strokeOpacity={0.5} strokeWidth={1.5} strokeLinecap="round" />
          <path d="M142 116c6-2 22-2 28 1" stroke="#a9bba3" strokeOpacity={0.35} strokeWidth={1.5} strokeLinecap="round" />
          <circle cx="85" cy="68" r="3.5" fill="#c97d3a" opacity={0.65} />
          <circle cx="242" cy="158" r="2.5" fill="#c97d3a" opacity={0.45} />
          <circle cx="220" cy="70" r="4.5" fill="#4e7d5b" opacity={0.5} />
          <circle cx="62" cy="148" r="3" fill="#4e7d5b" opacity={0.4} />
          <circle cx="255" cy="96" r="2" fill="#a9bba3" opacity={0.4} />
        </svg>
      );

    case "today":
      return (
        <svg viewBox="0 0 320 220" fill="none" aria-hidden>
          {(["M","T","W","T","F","S","S"] as const).map((d, i) => (
            <g key={i} transform={`translate(${56 + i * 32}, 46)`}>
              <text x="11" y="14" textAnchor="middle" fill="#a9bba3" fontSize="9" fontFamily="Space Grotesk, sans-serif" opacity={0.6}>{d}</text>
              <rect x="0" y="20" width="22" height="28" rx="7"
                fill={i < 3 ? "#4e7d5b" : i === 3 ? "#c97d3a" : "#223228"}
                opacity={i > 3 ? 0.5 : 1}
              />
              {i < 3 && <path d="M6 34l4 4 8-8" stroke="white" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />}
              {i === 3 && <circle cx="11" cy="34" r="3" fill="white" />}
            </g>
          ))}
          <rect x="52" y="110" width="216" height="82" rx="14" fill="#223228" />
          <rect x="70" y="126" width="90" height="8" rx="4" fill="#4e7d5b" opacity={0.65} />
          <rect x="70" y="142" width="152" height="6" rx="3" fill="#344137" />
          <rect x="70" y="156" width="124" height="6" rx="3" fill="#344137" />
          <rect x="70" y="170" width="90" height="6" rx="3" fill="#344137" />
          <circle cx="234" cy="152" r="16" fill="#c97d3a" opacity={0.12} />
          <path d="M228 152l4 4 9-9" stroke="#c97d3a" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case "coach":
      return (
        <svg viewBox="0 0 320 220" fill="none" aria-hidden>
          <rect x="36" y="30" width="190" height="68" rx="18" fill="#223228" />
          <path d="M52 98l-14 16h18" fill="#223228" />
          <rect x="54" y="48" width="120" height="8" rx="4" fill="#4e7d5b" opacity={0.7} />
          <rect x="54" y="64" width="154" height="7" rx="3.5" fill="#344137" />
          <rect x="54" y="79" width="96" height="7" rx="3.5" fill="#344137" />
          <path d="M240 42l2.2 6.5 6.8 2.2-6.8 2.2L240 59l-2.2-6.1-6.8-2.2 6.8-2.2z" fill="#c97d3a" opacity={0.85} />
          <rect x="94" y="130" width="190" height="58" rx="18" fill="#315c3d" />
          <path d="M268 174l14 16h-18" fill="#315c3d" />
          <rect x="112" y="147" width="130" height="8" rx="4" fill="white" opacity={0.5} />
          <rect x="112" y="163" width="88" height="8" rx="4" fill="white" opacity={0.3} />
          <circle cx="82" cy="140" r="12" fill="#315c3d" />
          <path d="M78 140l3 3 6-6" stroke="white" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case "workouts":
      return (
        <svg viewBox="0 0 320 220" fill="none" aria-hidden>
          {([
            { x: 88, ys: [178, 152, 125, 100, 80], color: "#4e7d5b", off: [0,6,-5,4,-3] },
            { x: 160, ys: [178, 148, 118, 92, 70, 54], color: "#c97d3a", off: [0,-6,5,-4,3,-5] },
            { x: 232, ys: [178, 155, 130, 108, 90], color: "#4e7d5b", off: [0,5,-4,6,-2] },
          ]).map(({ x, ys, color, off }) => (
            <g key={x}>
              <line x1={x} y1={ys[0]} x2={x} y2="195" stroke="#344137" strokeWidth={1.5} strokeDasharray="3 4" />
              {ys.map((y, i) => {
                const cx = x + (off[i] || 0);
                return (
                  <g key={i}>
                    <circle cx={cx} cy={y} r={i === 0 ? 10 : 7} fill={color} opacity={i < 2 ? 1 : 0.35} />
                    {i < 2 && <circle cx={cx} cy={y} r={i === 0 ? 14 : 10} fill={color} opacity={0.12} />}
                  </g>
                );
              })}
            </g>
          ))}
          <rect x="52" y="192" width="216" height="4" rx="2" fill="#344137" />
          <rect x="52" y="192" width="140" height="4" rx="2" fill="#4e7d5b" opacity={0.7} />
        </svg>
      );

    case "warmup":
      return (
        <svg viewBox="0 0 320 220" fill="none" aria-hidden>
          <circle cx="160" cy="42" r="20" fill="none" stroke="#4e7d5b" strokeWidth={1.5} strokeOpacity={0.4} />
          <line x1="160" y1="62" x2="160" y2="136" stroke="#4e7d5b" strokeWidth={2} strokeOpacity={0.3} />
          <line x1="160" y1="84" x2="112" y2="118" stroke="#4e7d5b" strokeWidth={2} strokeOpacity={0.3} />
          <line x1="160" y1="84" x2="208" y2="118" stroke="#4e7d5b" strokeWidth={2} strokeOpacity={0.3} />
          <line x1="160" y1="136" x2="136" y2="188" stroke="#4e7d5b" strokeWidth={2} strokeOpacity={0.3} />
          <line x1="160" y1="136" x2="184" y2="188" stroke="#4e7d5b" strokeWidth={2} strokeOpacity={0.3} />
          {/* glowing shoulder */}
          <circle cx="160" cy="84" r="16" fill="#c97d3a" opacity={0.1} />
          <circle cx="160" cy="84" r="9" fill="#c97d3a" opacity={0.2} />
          <circle cx="160" cy="84" r="5" fill="#c97d3a" opacity={0.85} />
          {/* wrists */}
          <circle cx="112" cy="118" r="10" fill="#4e7d5b" opacity={0.15} />
          <circle cx="112" cy="118" r="5" fill="#4e7d5b" opacity={0.9} />
          <circle cx="208" cy="118" r="10" fill="#4e7d5b" opacity={0.15} />
          <circle cx="208" cy="118" r="5" fill="#4e7d5b" opacity={0.9} />
          {/* hips */}
          <circle cx="160" cy="136" r="12" fill="#c97d3a" opacity={0.12} />
          <circle cx="160" cy="136" r="5" fill="#c97d3a" opacity={0.65} />
          {/* finger lines */}
          {([-7,-2,3,8] as const).map((o, i) => (
            <line key={i} x1={100 + o} y1="120" x2={98 + o * 1.3} y2="132" stroke="#a9bba3" strokeWidth={1.5} strokeLinecap="round" strokeOpacity={0.5} />
          ))}
        </svg>
      );

    default:
      return null;
  }
}

function Onboarding({ onComplete, introOnly }: { onComplete: (profile: UserProfile) => void; introOnly?: boolean }) {
  const [phase, setPhase] = useState<"intro" | "account" | "profile">("intro");
  const [slideIdx, setSlideIdx] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const [profileStep, setProfileStep] = useState(0);
  const [formError, setFormError] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [grade, setGrade] = useState("");
  const [climbingStyle, setClimbingStyle] = useState("");
  const [climbingLocation, setClimbingLocation] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [fingerTrainingExperience, setFingerTrainingExperience] = useState("");
  const [goals, setGoals] = useState<string[]>([]);
  const [customGoal, setCustomGoal] = useState("");
  const [gender, setGender] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [currentInjuries, setCurrentInjuries] = useState("");
  const [trainingDays, setTrainingDays] = useState<string[]>([]);
  const [sessionsPerWeek, setSessionsPerWeek] = useState("");
  const [sessionLength, setSessionLength] = useState("");
  const [equipment, setEquipment] = useState<string[]>([]);

  const slide = INTRO_SLIDES[slideIdx];
  const isLastIntro = slideIdx === INTRO_SLIDES.length - 1;
  const steps = ["Account", "Terms", "Background", "Goals", "Body", "Logistics"];

  function nextSlide() {
    if (!isLastIntro) {
      setAnimKey((key) => key + 1);
      setSlideIdx((index) => index + 1);
    } else {
      setPhase("account");
    }
  }

  function prevSlide() {
    if (slideIdx > 0) {
      setAnimKey((key) => key + 1);
      setSlideIdx((index) => index - 1);
    }
  }

  function toggleValue(value: string, values: string[], setter: React.Dispatch<React.SetStateAction<string[]>>) {
    setter(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  }

  function nextProfileStep() {
    setFormError("");
    if (profileStep === 0) {
      if (!name.trim() || !email.trim() || !password) {
        setFormError("Please complete your name, email, and password.");
        return;
      }
      if (!email.includes("@")) {
        setFormError("Enter a valid email address.");
        return;
      }
      if (password.length < 8) {
        setFormError("Your password must be at least 8 characters.");
        return;
      }
    }
    if (profileStep === 1 && !acceptedTerms) {
      setFormError("You need to agree to the terms to continue.");
      return;
    }
    if (profileStep < steps.length - 1) {
      setProfileStep((step) => step + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const allGoals = customGoal.trim() ? [...goals, customGoal.trim()] : goals;
    onComplete({
      name: name.trim(), email: email.trim(), grade, note: "", height, armSpan: "", gender, weight,
      goals: allGoals, climbingStyle, climbingLocation, experienceLevel, fingerTrainingExperience,
      currentInjuries, sessionsPerWeek, trainingDays, sessionLength, equipment,
    });
  }

  function PickGroup({ options, value, onChange }: { options: string[]; value: string; onChange: (value: string) => void }) {
    return (
      <div className="pick-group">
        {options.map((option) => (
          <Button key={option} type="button" variant="ghost" className={`pick-option${value === option ? " selected" : ""}`} onClick={() => onChange(value === option ? "" : option)} aria-pressed={value === option}>
            {value === option && <Icon name="check" size={13} />}{option}
          </Button>
        ))}
      </div>
    );
  }

  function MultiPick({ options, values, onToggle }: { options: string[]; values: string[]; onToggle: (value: string) => void }) {
    return (
      <div className="goal-chips">
        {options.map((option) => (
          <Button key={option} type="button" variant="ghost" className={`goal-chip${values.includes(option) ? " selected" : ""}`} onClick={() => onToggle(option)} aria-pressed={values.includes(option)}>
            {values.includes(option) && <Icon name="check" size={13} />}{option}
          </Button>
        ))}
      </div>
    );
  }

  if (phase === "intro") return (
    <div className="intro-shell">
      <Button variant="ghost" className="intro-skip" onClick={() => setPhase("account")}>Skip</Button>
      <div className="intro-visual"><SlideVisual key={animKey} id={slide.id} /></div>
      <div className="intro-body">
        <div key={animKey} className="slide-content-anim">
          <div className="eyebrow">{slide.eyebrow}</div>
          <Heading level={1} className="intro-title">{slide.title}</Heading>
          <p className="intro-desc">{slide.body}</p>
        </div>
        <div className="intro-footer">
          <div className="intro-progress">
            {slideIdx > 0 && <Button variant="ghost" className="intro-back-btn" onClick={prevSlide} aria-label="Previous slide"><Icon name="arrow" /></Button>}
            <div className="slide-dots">{INTRO_SLIDES.map((_, index) => <div key={index} className={`slide-dot${index === slideIdx ? " active" : ""}`} />)}</div>
          </div>
          <Button className="intro-cta-btn" onClick={nextSlide}>{isLastIntro ? "Get started" : "Continue"} <Icon name="arrow" /></Button>
        </div>
      </div>
    </div>
  );

  if (phase === "account") return (
    <div className="account-shell">
      <div className="account-visual"><div className="brand brand-light"><span>Bouldy</span></div></div>
      <div className="account-card">
        <Heading level={1} className="account-title">How would you like to start?</Heading>
        <p className="account-desc">Create a profile so Bouldy can remember you and personalize your coaching, or explore as a guest.</p>
        <div className="account-choices">
          <Button className="account-cta wide-button" onClick={() => setPhase("profile")}>Create my profile <Icon name="arrow" /></Button>
          <Button variant="secondary" className="wide-button" onClick={() => onComplete({ name: "", grade: "", note: "", height: "", armSpan: "", goals: [] })}>Continue as guest</Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="profile-slideshow-shell">
      <aside className="profile-step-rail">
        <div className="profile-brand">Bouldy</div>
        <div className="profile-rail-copy">
          <div className="eyebrow">Personal setup</div>
          <Heading level={1} className="profile-rail-title">Tell us about yourself.</Heading>
          <p>A few thoughtful answers help your coach shape every session around you.</p>
        </div>
        <div className="profile-step-list" aria-label="Profile setup progress">
          {steps.map((step, index) => (
            <div key={step} className={`profile-step-item${index === profileStep ? " active" : ""}${index < profileStep ? " complete" : ""}`}>
              <span className="profile-step-dot">{index < profileStep ? <Icon name="check" size={13} /> : index + 1}</span>
              <span>{step}</span>
            </div>
          ))}
        </div>
      </aside>

      <main className="profile-slide-main">
        <div className="profile-mobile-progress">
          <span>Step {profileStep + 1} of {steps.length}</span>
          <div className="profile-mobile-dots">{steps.map((step, index) => <span key={step} className={`profile-mobile-dot${index <= profileStep ? " active" : ""}`} />)}</div>
        </div>

        <div className="profile-slide-card slide-content-anim" key={profileStep}>
          {profileStep === 0 && <>
            <div className="profile-slide-heading"><Heading level={2}>Create your account</Heading></div>
            <div className="field-group"><label className="field-label" htmlFor="ob-name">Name</label><input id="ob-name" className="text-field" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Alex Morgan" /></div>
            <div className="field-group"><label className="field-label" htmlFor="ob-email">Email</label><input id="ob-email" className="text-field" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="alex@example.com" /></div>
            <div className="field-group"><label className="field-label" htmlFor="ob-password">Password</label><input id="ob-password" className="text-field" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" /><p className="field-hint">Use 8 or more characters.</p></div>
            <p className="account-login-prompt">Already have an account? <span>Log in</span></p>
          </>}

          {profileStep === 1 && <>
            <div className="profile-slide-heading"><div className="eyebrow">Terms & conditions</div><Heading level={2}>Before you start</Heading><p>To recieve our services, you must agree to the following:</p></div>
            <div className="terms-card" tabIndex={0}>
              <Heading level={3}>Bouldy training agreement</Heading>
              <p>I agree to the storage and processing of my personal data, which will include special category data relateted to health. I understand that Bouldy will be unable to provide its services without this data.</p>
              <p>Stop any exercise that causes sharp or increasing pain. If you have an injury, health condition, or concern, consult a qualified healthcare professional before training.</p>
              <p>I understand that training comes with a risk of injury or death and i am responsible for my own actions.</p>
              <p>Your messages and personal data are sent to and processed by servers in the United States to generate your training plan and feedback.</p>
              <p>Climbing history, injuries, goals and chat messages are shared with our AI provider, Anthropic.</p>
            </div>
            <label className={`terms-agree${acceptedTerms ? " selected" : ""}`} htmlFor="terms-check"><input id="terms-check" type="checkbox" checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} /><span className="terms-checkmark"><Icon name="check" size={16} /></span><span>I have read and agree to the Terms & Conditions.</span></label>
          </>}

          {profileStep === 2 && <>
            <div className="profile-slide-heading"><Heading level={2}>Climbing background</Heading></div>
            <div className="field-group"><div className="field-label">Current Font grade <span>Hardest grade you send consistently</span></div><div className="grade-grid profile-grade-grid">{FONT_GRADES.map((item) => <Button key={item} type="button" variant="ghost" className={`grade-option${grade === item ? " selected" : ""}`} onClick={() => setGrade(grade === item ? "" : item)} aria-pressed={grade === item}>{item}</Button>)}</div></div>
            <div className="field-group"><div className="field-label">Preferred climbing style</div><PickGroup options={["Bouldering", "Sports climbing", "Trad climbing", "Multi-pitch climbing"]} value={climbingStyle} onChange={setClimbingStyle} /></div>
            <div className="field-group"><div className="field-label">Where do you usually climb?</div><PickGroup options={["Indoors", "Outdoors", "Both"]} value={climbingLocation} onChange={setClimbingLocation} /></div>
            <div className="field-group"><div className="field-label">Experience level</div><PickGroup options={["Beginner", "Intermediate", "Advanced"]} value={experienceLevel} onChange={setExperienceLevel} /></div>
            <div className="field-group"><div className="field-label">Finger training experience</div><PickGroup options={["Beginner", "Intermediate", "Advanced"]} value={fingerTrainingExperience} onChange={setFingerTrainingExperience} /></div>
          </>}

          {profileStep === 3 && <>
            <div className="profile-slide-heading"><Heading level={2}>Your goals</Heading><p>Choose as many as you like. Your goals can change over time.</p></div>
            <div className="field-group"><div className="field-label">Choose your goals <span>Select all that apply</span></div><MultiPick options={GOALS} values={goals} onToggle={(goal) => toggleValue(goal, goals, setGoals)} /></div>
            <div className="field-group"><label className="field-label" htmlFor="custom-goal">Add your own goal <span>Optional</span></label><input id="custom-goal" className="text-field" value={customGoal} onChange={(event) => setCustomGoal(event.target.value)} placeholder="My personal goal is..." /></div>
          </>}

          {profileStep === 4 && <>
            <div className="profile-slide-heading"><Heading level={2}>Body metrics</Heading></div>
            <div className="field-group"><div className="field-label">Gender <span>Optional</span></div><PickGroup options={["Woman", "Man", "Non-binary", "Prefer not to say"]} value={gender} onChange={setGender} /></div>
            <div className="two-fields"><div className="field-group field-group-flat"><label className="field-label" htmlFor="ob-height">Height <span>cm</span></label><input id="ob-height" className="text-field" type="number" min={100} max={250} value={height} onChange={(event) => setHeight(event.target.value)} placeholder="175" /></div><div className="field-group field-group-flat"><label className="field-label" htmlFor="ob-weight">Weight <span>kg</span></label><input id="ob-weight" className="text-field" type="number" min={25} max={250} value={weight} onChange={(event) => setWeight(event.target.value)} placeholder="70" /></div></div>
            <div className="field-group"><label className="field-label" htmlFor="ob-injuries">Any current injuries or pain? <span>Optional</span></label><textarea id="ob-injuries" className="text-field note-field" value={currentInjuries} onChange={(event) => setCurrentInjuries(event.target.value)} placeholder="Tell us where, what movements affect it, and how it feels..." /><p className="field-hint">Your coach will avoid suggesting movements that could aggravate this area.</p></div>
          </>}

          {profileStep === 5 && <>
            <div className="profile-slide-heading"><Heading level={2}>Logistics</Heading></div>
            <div className="field-group"><div className="field-label">Which days would you like to train? <span>Select all that apply</span></div><MultiPick options={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]} values={trainingDays} onToggle={(day) => toggleValue(day, trainingDays, setTrainingDays)} /></div>
            <div className="field-group"><div className="field-label">How many training days per week?</div><PickGroup options={["1 day", "2 days", "3 days", "4 days", "5+ days"]} value={sessionsPerWeek} onChange={setSessionsPerWeek} /></div>
            <div className="field-group"><div className="field-label">How long should a session be?</div><PickGroup options={["30–45 min", "45–60 min", "60–90 min", "90+ min"]} value={sessionLength} onChange={setSessionLength} /></div>
            <div className="field-group"><div className="field-label">Equipment access <span>Select all that apply</span></div><MultiPick options={["Climbing wall", "Hangboard", "Kilter board", "Spray wall", "Weights / gym", "Resistance bands", "No equipment"]} values={equipment} onToggle={(item) => toggleValue(item, equipment, setEquipment)} /></div>
          </>}

          {formError && <div className="profile-form-error" role="alert">{formError}</div>}
          <div className="profile-slide-actions">
            {profileStep > 0 ? <Button variant="secondary" onClick={() => { setFormError(""); setProfileStep((step) => step - 1); }}><span className="back-arrow"><Icon name="arrow" /></span> Back</Button> : <span />}
            <Button onClick={nextProfileStep} disabled={profileStep === 1 && !acceptedTerms}>{profileStep === steps.length - 1 ? "Build my plan" : "Continue"} <Icon name="arrow" /></Button>
          </div>
        </div>
      </main>
    </div>
  );
}
function Nav({ view, onChange }: { view: AppView; onChange: (view: AppView) => void }) {
  const items: { key: AppView; label: string; icon: IconName }[] = [
    { key: "today", label: "Today", icon: "home" },
    { key: "coach", label: "AI Coach", icon: "message" },
    { key: "analyze", label: "Analyze", icon: "target" },
    { key: "workout", label: "Workouts", icon: "workout" },
    { key: "warmup", label: "Warm up", icon: "warmup" },
    { key: "history", label: "History", icon: "history" },
  ];
  return (
    <>
      <aside className="sidebar">
        <div className="brand sidebar-brand"><span className="brand-stone">🪨</span><span>Bouldy</span></div>
        <nav className="nav-list" aria-label="Main navigation">
          {items.map((item) => (
            <Button key={item.key} variant="ghost" className={`nav-item ${view === item.key ? "active" : ""}`} onClick={() => onChange(item.key)}>
              <Icon name={item.icon} /><span>{item.label}</span>
            </Button>
          ))}
        </nav>
        <div className="sidebar-coach">
          <div className="coach-orb small"><Icon name="spark" size={18} /></div>
          <div><strong>Coach online</strong><span>Ready when you are</span></div>
        </div>
      </aside>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {[
          { key: "today" as AppView, label: "Today", icon: "home" as IconName },
          { key: "coach" as AppView, label: "Coach", icon: "message" as IconName },
          { key: "workout" as AppView, label: "Train", icon: "workout" as IconName, also: "warmup" as AppView },
          { key: "analyze" as AppView, label: "Analyze", icon: "target" as IconName },
          { key: "history" as AppView, label: "History", icon: "history" as IconName },
        ].map((item) => {
          const isActive = view === item.key || ("also" in item && view === item.also);
          return (
            <Button key={item.key} variant="ghost" className={`mobile-nav-item ${isActive ? "active" : ""}`} onClick={() => onChange(item.key)}>
              <Icon name={item.icon} size={19} /><span>{item.label}</span>
            </Button>
          );
        })}
      </nav>
    </>
  );
}

function PageHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return (
    <header className="page-header">
      <div><div className="eyebrow" style={{ fontSize: 14 }}>{eyebrow}</div><Heading level={1} className="page-title">{title}</Heading></div>
    </header>
  );
}

function Today({ name, grade, onChange }: { name: string; grade: string; onChange: (view: AppView) => void }) {
  const todayDate = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  return (
    <>
      <PageHeader eyebrow={todayDate} title={`Good morning${name ? `, ${name}` : ""}.`} />

      <div className="section-heading"><div><span className="eyebrow">Up next</span><Heading>Today's session</Heading></div><span className="session-time"><Icon name="clock" size={17} /> 55 min</span></div>
      <section className="today-grid">
        <article className="plan-card">
          <div className="plan-card-top">
            <div className="plan-icon"><Icon name="target" /></div>
            <span className="tag">Recommended</span>
          </div>
          <Heading level={3}>Precision & movement</Heading>
          <p>A technique-focused session to make every move more efficient.</p>
          <ol className="workout-steps">
            <li><span>01</span><div><strong>Full body warm-up</strong><small>10 minutes</small></div></li>
            <li><span>02</span><div><strong>Silent feet drill</strong><small>4 easy problems</small></div></li>
            <li><span>03</span><div><strong>Limit attempts</strong><small>3 projects at {grade}</small></div></li>
          </ol>
          <Button className="wide-button" onClick={() => onChange("workout")}><Icon name="play" size={18} /> Start workout</Button>
        </article>

        <div className="side-stack">
          <article className="progress-card">
            <div className="card-heading-row"><div><span className="eyebrow">This week</span><Heading level={3}>Climbing load</Heading></div><strong>2 / 3</strong></div>
            <div className="week-bars">
              {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => <div key={`${day}-${index}`}><span className={index === 0 || index === 3 ? "filled" : index === 5 ? "planned" : ""} /><small>{day}</small></div>)}
            </div>
            <p>One more quality session to hit your weekly target.</p>
          </article>
          <Button variant="secondary" className="quick-card" onClick={() => onChange("warmup")}>
            <span className="quick-icon"><Icon name="warmup" /></span><span><strong>Need a quick warm-up?</strong><small>Guided routines from 5–15 min</small></span><Icon name="chevron" />
          </Button>
          <Button variant="secondary" className="quick-card" onClick={() => onChange("history")}>
            <span className="quick-icon amber"><Icon name="history" /></span><span><strong>Review your progress</strong><small>See sessions, sends, and notes</small></span><Icon name="chevron" />
          </Button>
        </div>
      </section>
    </>
  );
}

function Coach({
  grade,
  profile,
  analysis,
  onAnalyze,
}: {
  grade: string;
  profile: UserProfile;
  analysis: AnalysisReport | null;
  onAnalyze: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "coach", text: `I'm ready to help. Since you're climbing around ${grade}, we can work on technique, structure a training week, or review a route. What's on your mind?` },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const suggestions = ["Build my next workout", "Help with a project", "Review my training week"];

  async function submit(text = input) {
    const message = text.trim();
    if (!message || loading) return;

    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          history: messages.filter((_, index) => index > 0).slice(-12).map((item) => ({
            role: item.role === "coach" ? "model" : "user",
            text: item.text,
          })),
          analysis,
          profile: {
            grade: profile.grade,
            goals: profile.goals,
            climbingStyle: profile.climbingStyle,
            experienceLevel: profile.experienceLevel,
            sessionsPerWeek: profile.sessionsPerWeek,
            trainingDays: profile.trainingDays,
            sessionLength: profile.sessionLength,
            equipment: profile.equipment,
          },
        }),
      });
      const responseBody = await response.text();
      let data: { reply?: string; error?: string } = {};
      if (responseBody) {
        try {
          data = JSON.parse(responseBody);
        } catch {
          throw new Error(`The coach returned an invalid response (HTTP ${response.status}).`);
        }
      }
      if (!response.ok) {
        throw new Error(data.error || `Chat request failed (HTTP ${response.status}).`);
      }
      if (typeof data.reply !== "string" || !data.reply.trim()) {
        throw new Error("The coach returned an empty reply. Please try again.");
      }
      setMessages((current) => [
        ...current,
        { role: "user", text: message },
        { role: "coach", text: data.reply! },
      ]);
      setInput("");
    } catch (requestError) {
      setError(requestError instanceof Error && requestError.message === "Failed to fetch"
        ? "Could not reach the coach. Make sure the API server is running."
        : requestError instanceof Error
          ? requestError.message
          : "The coach could not answer. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="coach-page">
      <PageHeader eyebrow="Personal guidance" title="AI Coach" description="Bouldering expertise, shaped around your goals and training." />
      <section className="chat-card">
        <div className="chat-header"><div className="coach-orb small"><Icon name="spark" size={18} /></div><div><strong>Bouldy Coach</strong><span><i /> Online · Knows your plan</span></div></div>
        <div className="messages" aria-live="polite" aria-busy={loading}>
          {messages.map((message, index) => (
            <div key={index} className={`message ${message.role}`}>
              {message.role === "coach" && <div className="message-avatar"><Icon name="spark" size={15} /></div>}
              <div className="message-bubble"><p>{message.text}</p></div>
            </div>
          ))}
          {loading && <div className="message coach"><div className="message-avatar"><Icon name="spark" size={15} /></div><div className="message-bubble"><p>Thinking through that…</p></div></div>}
        </div>
        {error && <p className="chat-request-error" role="alert">{error}</p>}
        {messages.length < 3 && <div className="suggestions">{suggestions.map((suggestion) => <Button key={suggestion} variant="secondary" disabled={loading} onClick={() => submit(suggestion)}>{suggestion}</Button>)}</div>}
        <form className="composer" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
          <textarea aria-label="Ask the climbing coach" maxLength={2000} value={input} disabled={loading} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void submit(); } }} placeholder="Ask about training, technique, or a route..." />
          <Button variant="icon" className="send-button" type="submit" disabled={loading || !input.trim()} aria-label="Send message"><Icon name="send" size={18} /></Button>
        </form>
        <p className="composer-note"><Icon name="image" size={14} /> For video movement analysis, use the Analyze tab.</p>
        {analysis && <p className="composer-context">The coach can reference your latest video analysis.</p>}
        <Button variant="secondary" className="analyze-link" onClick={onAnalyze}><Icon name="target" size={17} /> Analyze a climbing video</Button>
      </section>
    </div>
  );
}

function formatAnalysisTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remainder = String(Math.floor(seconds % 60)).padStart(2, "0");
  return `${minutes}:${remainder}`;
}

function Analyze({ active, onAnalyzed }: { active: boolean; onAnalyzed: (report: AnalysisReport | null) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [duration, setDuration] = useState(0);
  const [frames, setFrames] = useState<SampledFrame[]>([]);
  const [frameCount, setFrameCount] = useState(4);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
  }, [videoUrl]);

  useEffect(() => {
    if (!active) videoRef.current?.pause();
  }, [active]);

  function selectVideo(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      setError("Choose a video file to analyse.");
      event.target.value = "";
      return;
    }
    event.target.value = "";
    setError("");
    setReport(null);
    setFrames([]);
    setDuration(0);
    setFileName(file.name);
    setVideoUrl(URL.createObjectURL(file));
    onAnalyzed(null);
  }

  async function extractFrames() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !duration) {
      throw new Error("Wait for the video to finish loading, then try again.");
    }

    const times = Array.from({ length: frameCount }, (_, index) =>
      Math.max(0, Math.min(duration - 0.05, (duration * (index + 0.5)) / frameCount))
    );
    const sampled: SampledFrame[] = [];

    for (const time of times) {
      if (Math.abs(video.currentTime - time) > 0.01) {
        await new Promise<void>((resolve, reject) => {
          const onSeeked = () => {
            video.removeEventListener("error", onError);
            resolve();
          };
          const onError = () => {
            video.removeEventListener("seeked", onSeeked);
            reject(new Error("Could not seek through this video. Try another video file."));
          };
          video.addEventListener("seeked", onSeeked, { once: true });
          video.addEventListener("error", onError, { once: true });
          video.currentTime = time;
        });
      }

      const scale = Math.min(1, 512 / video.videoWidth);
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      const context = canvas.getContext("2d");
      if (!context || !canvas.width || !canvas.height) {
        throw new Error("Could not read frames from this video. Try another video file.");
      }
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      sampled.push({ time, image: canvas.toDataURL("image/jpeg", 0.5) });
    }
    return sampled;
  }

  async function analyzeVideo() {
    if (!videoUrl || loading) return;
    setLoading(true);
    setError("");
    setReport(null);
    onAnalyzed(null);
    try {
      const sampled = await extractFrames();
      setFrames(sampled);
      const response = await fetch(`${API}/api/analyse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoName: fileName,
          duration,
          frames: sampled,
        }),
      });
      const responseBody = await response.text();
      let data: AnalysisReport & { error?: string; message?: string } = {} as AnalysisReport & { error?: string; message?: string };
      if (responseBody) {
        try {
          data = JSON.parse(responseBody);
        } catch {
          throw new Error(`The analysis server returned an invalid response (HTTP ${response.status}).`);
        }
      }
      if (!response.ok) {
        throw new Error(data.error || data.message || `Analysis request failed (HTTP ${response.status}).`);
      }
      if (!responseBody || typeof data.headline !== "string") {
        throw new Error("The analysis server returned an incomplete report. Please try again.");
      }
      setReport(data);
      onAnalyzed(data);
    } catch (requestError) {
      setError(requestError instanceof Error
        ? requestError.message
        : "The coach could not analyse this video. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="analysis-page">
      <PageHeader eyebrow="Video feedback" title="Analyze your climb" description="Get movement-specific feedback from a few representative frames." />
      <section className="analysis-upload-card">
        {!videoUrl ? (
          <label className="analysis-dropzone">
            <input ref={fileInputRef} type="file" accept="video/*" onChange={selectVideo} />
            <span className="analysis-upload-icon"><Icon name="image" size={26} /></span>
            <strong>Choose a climbing video</strong>
            <span>MP4, MOV, or WebM · Your original video stays on this device</span>
            <span className="button button-primary">Choose video</span>
          </label>
        ) : (
          <>
            <div className="analysis-video-wrap">
              <video
                ref={videoRef}
                src={videoUrl}
                controls
                onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
              />
            </div>
            <div className="analysis-video-meta">
              <div><strong>{fileName}</strong><span>{formatAnalysisTime(duration)} · {frames.length || "No"} frames sampled</span></div>
              <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>Change video</Button>
              <input ref={fileInputRef} hidden type="file" accept="video/*" onChange={selectVideo} />
            </div>
          </>
        )}
        <canvas ref={canvasRef} hidden />
      </section>

      <section className="analysis-controls">
        <label className="analysis-frame-control">
          <span>Frames to analyse <strong>{frameCount}</strong></span>
          <input type="range" min="4" max="8" step="1" value={frameCount} disabled={loading} onChange={(event) => setFrameCount(Number(event.target.value))} />
          <span className="analysis-frame-range"><span>4</span><span>8</span></span>
        </label>
        <Button disabled={!videoUrl || !duration || loading} onClick={() => void analyzeVideo()}>
          {loading ? "Coach is analysing…" : report ? "Analyse again" : "Analyse my climb"}
          {!loading && <Icon name="arrow" size={18} />}
        </Button>
      </section>

      {error && <p className="analysis-error" role="alert">{error}</p>}

      {report && (
        <section className="analysis-report" aria-live="polite">
          <div className="analysis-report-heading">
            <div><span className="eyebrow">COACHING REPORT</span><Heading level={2}>{report.headline}</Heading></div>
            <strong>{report.overallScore}<small>/10</small></strong>
          </div>
          {report.scores && <div className="analysis-scores">
            {report.scores.map((score) => (
              <div className="analysis-score" key={score.category}>
                <span>{score.category}</span><strong>{score.score}/10</strong>
                <div><i style={{ width: `${Math.max(0, Math.min(100, score.score * 10))}%` }} /></div>
              </div>
            ))}
          </div>}
          {report.biggestOpportunity && <article className="analysis-opportunity">
            <span className="eyebrow">BIGGEST OPPORTUNITY</span>
            <Heading level={3}>{report.biggestOpportunity.title}</Heading>
            <p>{report.biggestOpportunity.explanation}</p>
            <strong>Try this: </strong>{report.biggestOpportunity.drill}
          </article>}
          {report.moments && report.moments.length > 0 && <div className="analysis-section">
            <span className="eyebrow">KEY MOMENTS</span>
            {report.moments.map((moment, index) => (
              <button key={`${moment.time}-${index}`} className="analysis-moment" onClick={() => {
                if (videoRef.current) {
                  videoRef.current.currentTime = moment.time;
                  void videoRef.current.play();
                }
              }}>
                <span>{formatAnalysisTime(moment.time)}</span><span><strong>{moment.title}</strong><small>{moment.feedback}</small></span><Icon name="chevron" size={17} />
              </button>
            ))}
          </div>}
          {report.drills && report.drills.length > 0 && <div className="analysis-section">
            <span className="eyebrow">PRACTICE NEXT</span>
            {report.drills.map((drill, index) => (
              <div className="analysis-drill" key={`${drill.name}-${index}`}><span>{index + 1}</span><div><strong>{drill.name}</strong><small>{drill.instructions}</small></div></div>
            ))}
          </div>}
        </section>
      )}
      {frames.length > 0 && <section className="analysis-frames">
        <div className="section-heading"><div><span className="eyebrow">SAMPLED FRAMES</span><Heading level={2}>What the AI saw</Heading></div></div>
        <div className="analysis-frame-grid">
          {frames.map((frame, index) => <figure key={index}><img src={frame.image} alt={`Climbing video frame at ${formatAnalysisTime(frame.time)}`} /><figcaption>{formatAnalysisTime(frame.time)}</figcaption></figure>)}
        </div>
      </section>}
    </div>
  );
}

function formatTimer(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function getMovementType(title: string) {
  const name = title.toLowerCase();
  if (/push|press|dip/.test(name)) return "push";
  if (/squat|deadlift|step-up|lunge|hip|ankle|calf/.test(name)) return "legs";
  if (/pull|row|hang|lever|plank/.test(name)) return "pull";
  if (/stretch|circle|chin tuck|glide|flick|pulse|switch|tilt|rotation|mobility/.test(name)) return "mobility";
  return "climb";
}

function getMovementCues(title: string) {
  const type = getMovementType(title);
  if (type === "pull") return ["Start with long arms and engaged shoulders.", "Drive your elbows down or back without swinging."];
  if (type === "push") return ["Brace your core and keep a strong line through your body.", "Lower under control, then press smoothly without shrugging."];
  if (type === "legs") return ["Keep your whole foot planted and your knee tracking over your toes.", "Move from your hips and finish tall without rushing."];
  if (type === "mobility") return ["Move slowly through a comfortable, pain-free range.", "Keep the rest of your body relaxed and avoid forcing the end position."];
  return ["Look at the next hold before you move and place your feet quietly.", "Keep your hips close to the wall and breathe through each move."];
}

function MovementVisual({ title }: { title: string }) {
  const type = getMovementType(title);
  return (
    <svg className="movement-visual" viewBox="0 0 280 150" fill="none" aria-label={`Movement illustration for ${title}`} role="img">
      <path className="movement-ground" d="M28 128h224" />
      {type === "pull" && (
        <>
          <path className="movement-equipment" d="M72 26h136M86 26v18M194 26v18" />
          <circle className="movement-body" cx="140" cy="52" r="10" />
          <path className="movement-body" d="M140 62v35m0-27-27-24m27 24 27-24m-27 51-20 29m20-29 20 29" />
          <path className="movement-accent" d="M109 72 99 61m72 11 10-11" />
        </>
      )}
      {type === "push" && (
        <>
          <circle className="movement-body" cx="190" cy="74" r="10" />
          <path className="movement-body" d="m180 79-61 22-45 2m52-5-18 27m18-27 31 23m19-36-38 3-22 18" />
          <path className="movement-accent" d="m71 92-9 11 10 10m62-19 14 6-8 12" />
        </>
      )}
      {type === "legs" && (
        <>
          <circle className="movement-body" cx="140" cy="48" r="10" />
          <path className="movement-body" d="M140 58v38m0-24-24 19m24-19 24 19m-24 5-30 28m30-28 34 27" />
          <path className="movement-equipment" d="M89 125h42m19 0h45" />
          <path className="movement-accent" d="m101 104 9-10 11 7m38 0 11-7 9 10" />
        </>
      )}
      {type === "mobility" && (
        <>
          <circle className="movement-body" cx="140" cy="45" r="10" />
          <path className="movement-body" d="M140 55v45m0-27-31 13m31-13 31 13m-31 14-23 27m23-27 23 27" />
          <path className="movement-accent" d="M101 65c-12 4-18 14-17 25m95-25c12 4 18 14 17 25M89 82l-5 8-7-7m114-1 5 8 7-7" />
        </>
      )}
      {type === "climb" && (
        <>
          <path className="movement-equipment" d="M64 128 91 22h126l-22 106" />
          <path className="movement-hold" d="m112 42 13-4 5 8-16 5Zm51 15 15-3 3 10-16 3Zm-65 31 14-3 4 9-16 4Zm61 18 14-4 5 9-17 5Z" />
          <circle className="movement-body" cx="142" cy="65" r="9" />
          <path className="movement-body" d="m138 74-9 28m4-15-23-13m22 11 30-20m-33 37-22 17m22-17 29 15" />
          <path className="movement-accent" d="m105 70 6 4-3 8m52-21 4 5-8 5" />
        </>
      )}
    </svg>
  );
}

function GuidedWorkout({
  plan,
  onExit,
  onComplete,
}: {
  plan: WorkoutPlan;
  onExit: () => void;
  onComplete: () => void;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [phase, setPhase] = useState<"exercise" | "rest" | "restComplete" | "complete">("exercise");
  const [remaining, setRemaining] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const step = plan.steps[stepIndex];
  const movementCues = getMovementCues(step.title);
  const isLast = stepIndex === plan.steps.length - 1;
  const timerRunning = phase === "rest" && !paused;

  useEffect(() => {
    if (phase === "complete") return;
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (!timerRunning) return;
    const timer = window.setInterval(() => {
      setRemaining((value) => {
        if (value > 1) return value - 1;
        setPaused(false);
        setPhase("restComplete");
        return 0;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [timerRunning]);

  function startRest() {
    setRemaining(step.restSeconds);
    setPaused(false);
    setPhase("rest");
  }

  function nextStep() {
    const next = stepIndex + 1;
    setStepIndex(next);
    setRemaining(0);
    setPaused(false);
    setShowGuide(false);
    setPhase("exercise");
  }

  const phaseLabel = phase === "rest"
    ? "Rest"
    : phase === "restComplete"
      ? "Rest complete"
      : "Self-paced exercise";

  if (phase === "complete") {
    return (
      <section className="active-workout">
        <article className="workout-complete">
          <span className="completion-mark"><Icon name="check" size={34} /></span>
          <span className="eyebrow">Workout complete</span>
          <Heading level={1}>Strong work.</Heading>
          <p>You completed all {plan.steps.length} exercises in {plan.title}.</p>
          <div><Icon name="clock" size={17} /> Total session time {formatTimer(elapsed)}</div>
          <Button onClick={onComplete}>Save and finish</Button>
        </article>
      </section>
    );
  }

  return (
    <section className="active-workout">
      <Button variant="ghost" className="back-button" onClick={onExit}>
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m15 18-6-6 6-6"/></svg>
        Exit workout
      </Button>
      <div className="workout-progress">
        <span>Exercise {stepIndex + 1} of {plan.steps.length}</span>
        <strong>{plan.title}</strong>
        <div><i style={{ width: `${((stepIndex + (phase === "rest" || phase === "restComplete" ? 1 : 0)) / plan.steps.length) * 100}%` }} /></div>
      </div>
      <article className={`exercise-player ${phase === "rest" ? "is-resting" : ""}`}>
        <span className="eyebrow">{phaseLabel}</span>
        <Heading level={2}>{phase === "rest" ? "Recover and reset" : step.title}</Heading>
        <p>{phase === "rest" ? "Breathe slowly, shake out, and prepare for the next exercise." : step.instructions}</p>
        {phase === "exercise" && (
          <div className="movement-guide">
            <Button variant="secondary" onClick={() => setShowGuide((value) => !value)} aria-expanded={showGuide}>
              {showGuide ? "Hide demonstration" : "How to do it"}
            </Button>
            {showGuide && (
              <div className="movement-guide-panel">
                <MovementVisual title={step.title} />
                <div>
                  <strong>Move with control</strong>
                  <span>{movementCues[0]}</span>
                  <span>{movementCues[1]}</span>
                  <span>Stop if you feel sharp pain or lose your form.</span>
                </div>
              </div>
            )}
          </div>
        )}
        <div className="player-meta">
          <span><Icon name="check" size={16} /> Recommended: {step.workLabel}</span>
          <span><Icon name="stopwatch" size={16} /> Rest: {step.restSeconds ? step.restSeconds < 60 ? `${step.restSeconds} sec` : `${Math.round(step.restSeconds / 60)} min` : "None"}</span>
        </div>
        {phase === "exercise" ? (
          <div className="self-paced-status">
            <Icon name="check" size={24} />
            <div><strong>Take the time you need</strong><span>Complete the recommended work with good form, then continue when you feel ready.</span></div>
          </div>
        ) : (
          <div className="countdown" aria-live="polite">
            <small>{phaseLabel}</small>
            <strong>{formatTimer(remaining)}</strong>
          </div>
        )}
        <div className="player-actions">
          {phase === "exercise" && (
            isLast
              ? <Button onClick={() => setPhase("complete")}><Icon name="check" size={17} /> Complete workout</Button>
              : step.restSeconds > 0
                ? <Button onClick={startRest}><Icon name="stopwatch" size={17} /> Start rest</Button>
                : <Button onClick={nextStep}>Next exercise <Icon name="arrow" size={17} /></Button>
          )}
          {phase === "rest" && (
            <>
              <Button onClick={() => setPaused((value) => !value)}>{paused ? "Resume" : "Pause"}</Button>
              <Button variant="secondary" onClick={() => { setRemaining(0); setPhase("restComplete"); }}>Skip rest</Button>
            </>
          )}
          {phase === "restComplete" && <Button onClick={nextStep}>Next exercise <Icon name="arrow" size={17} /></Button>}
        </div>
      </article>
      <div className="session-elapsed"><Icon name="clock" size={16} /> Session time {formatTimer(elapsed)}</div>
      <div className="up-next">
        <span className="eyebrow">{isLast ? "Final exercise" : "Up next"}</span>
        <strong>{isLast ? "Complete and save your session" : plan.steps[stepIndex + 1].title}</strong>
      </div>
    </section>
  );
}

function StrengthView({ onBack, onStart }: { onBack: () => void; onStart: (plan: WorkoutPlan) => void }) {
  const sections = [
    {
      title: "Pulls",
      icon: "workout" as IconName,
      desc: "Target the upper back and lats — the engine behind every big move.",
      exercises: [
        { name: "Weighted pull-ups", sets: "3 × 5–6", note: "Add weight via belt or vest. Full hang to chin-over-bar." },
        { name: "Horizontal rows", sets: "3 × 8–10", note: "Rings or barbell. Keep your body rigid and squeeze the shoulder blades." },
        { name: "Bent-over rows", sets: "3 × 8", note: "Hip-hinge position, barbell or dumbbell. Elbows drive back, not out." },
      ],
    },
    {
      title: "Pushes",
      icon: "target" as IconName,
      desc: "Shoulder stability and mantle strength — essential for topping out.",
      exercises: [
        { name: "Push-ups", sets: "3 × 10–15", note: "Add a pause at the bottom for extra shoulder recruitment." },
        { name: "Overhead press", sets: "3 × 6–8", note: "Barbell or dumbbells. Brace your core hard to protect the lower back." },
        { name: "Ring dips", sets: "3 × 6–8", note: "Control the descent — rings challenge shoulder stability throughout." },
      ],
    },
    {
      title: "Hinges and Squats",
      icon: "arrow" as IconName,
      desc: "Lower-body drive for high-stepping, rocking over, and generating momentum.",
      exercises: [
        { name: "Deadlifts", sets: "3 × 5", note: "Focus on hip hinge mechanics. Conventional or Romanian both work well." },
        { name: "Goblet squats", sets: "3 × 10", note: "Hold a kettlebell at chest height. Drive knees out over the toes." },
        { name: "Step-ups", sets: "3 × 8 each leg", note: "Use a box at knee height. Drive through the heel, not the toes." },
      ],
    },
    {
      title: "Core",
      icon: "spark" as IconName,
      desc: "Body tension on overhangs — without it, your feet pop and your hips sag.",
      exercises: [
        { name: "Hanging knee tucks", sets: "3 × 10–12", note: "Dead hang from a bar. Compress knees to chest and lower with control." },
        { name: "Front lever holds", sets: "3 × 5–10 sec", note: "Scale with tucked or single-leg variations. Quality over duration." },
        { name: "Plank variations", sets: "3 × 30–45 sec", note: "Side planks and hollow-body holds are the most climbing-specific." },
      ],
    },
  ];

  const guidelines = [
    { label: "Frequency", text: "Train strength 2 days per week to avoid overloading your forearms." },
    { label: "Volume", text: "Keep it minimalist — 2 to 3 sets per exercise, 5 to 10 reps per set." },
    { label: "Recovery", text: "Rest 3 to 4 minutes between heavy sets, or separate lifting from climbing by at least 4–6 hours." },
    { label: "Fingers", text: "Supplement this with hangboard or wall climbing. Connective tissue adapts slower than muscle — be patient." },
  ];

  return (
    <>
      <PageHeader eyebrow="Supplemental training" title="Strength exercises" description="Climber-focused strength work to support your time on the wall." />
      <Button variant="ghost" style={{ marginBottom: 24, color: "var(--muted)", gap: 6 }} onClick={onBack}>
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m15 18-6-6 6-6"/></svg>
        Back to overview
      </Button>
      <div style={{ display: "grid", gap: 20, marginBottom: 28 }}>
        {sections.map((sec) => {
          const plan: WorkoutPlan = {
            title: `${sec.title} strength session`,
            duration: "30–40 min",
            steps: sec.exercises.map((exercise, index) => ({
              title: exercise.name,
              instructions: exercise.note,
              workLabel: exercise.sets,
              workSeconds: 180,
              restSeconds: index === sec.exercises.length - 1 ? 0 : 180,
            })),
          };
          return (
          <article key={sec.title} className="plan-card">
            <div className="plan-card-top"><div className="plan-icon"><Icon name={sec.icon} /></div><span className="tag">{sec.title}</span></div>
            <div role="heading" aria-level={3} className="heading" style={{ marginTop: 14, fontSize: 20 }}>{sec.title}</div>
            <p style={{ margin: "6px 0 18px", color: "var(--muted)", fontSize: 14 }}>{sec.desc}</p>
            <ol className="workout-steps">
              {sec.exercises.map((ex, i) => (
                <li key={ex.name}>
                  <span>0{i + 1}</span>
                  <div><strong>{ex.name}</strong><small>{ex.note}</small><small>{ex.sets} · Rest 3 min</small></div>
                </li>
              ))}
            </ol>
            <Button className="wide-button" onClick={() => onStart(plan)}><Icon name="play" size={16} /> Start workout</Button>
          </article>
          );
        })}
      </div>
      <article className="plan-card">
        <div className="plan-card-top"><div className="plan-icon"><Icon name="calendar" /></div><span className="tag">Programming</span></div>
        <div role="heading" aria-level={3} className="heading" style={{ marginTop: 14, fontSize: 20 }}>Programming guidelines</div>
        <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
          {guidelines.map((g) => (
            <div key={g.label} style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 12, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
              <strong style={{ fontSize: 13, color: "var(--primary-dark)" }}>{g.label}</strong>
              <p style={{ margin: 0, fontSize: 13, color: "var(--muted)", lineHeight: 1.55 }}>{g.text}</p>
            </div>
          ))}
        </div>
      </article>
    </>
  );
}

function EnduranceView({ onBack, onStart }: { onBack: () => void; onStart: (plan: WorkoutPlan) => void }) {
  const types = [
    { name: "Aerobic Capacity (ARC)", desc: "Low-intensity, continuous climbing for 20–45 minutes where you barely feel a pump. Builds aerobic base and capillary density in the forearms." },
    { name: "Power Endurance", desc: "High-intensity climbing under a deep pump, relying on combined aerobic and anaerobic systems. The feeling of fighting through a forearm scream." },
  ];

  const workouts = [
    {
      name: "Continuous ARCing",
      type: "Aerobic base",
      duration: "20–45 min",
      steps: [
        "Choose a traversing wall or auto-belay at 3–4 grades below your limit.",
        "Climb continuously without touching the floor for the full duration.",
        "Focus on smooth footwork, breathing, and never gripping harder than needed.",
        "The goal is to stay below the pump threshold — you should be able to hold a conversation.",
      ],
    },
    {
      name: "4×4s",
      type: "Power endurance",
      duration: "~45 min",
      steps: [
        "Choose four boulder problems two grades below your maximum.",
        "Climb all four back-to-back with zero rest between problems.",
        "Rest exactly 5 minutes, then repeat for 4 total sets.",
        "The pump in set 3 and 4 is the point — stay in control and keep moving.",
      ],
    },
    {
      name: "Double Laps",
      type: "Power endurance",
      duration: "~40 min",
      steps: [
        "Choose a moderate lead route or long boulder problem.",
        "Climb it once, lower or step off immediately, then climb the exact same line again.",
        "Rest 10 minutes, then repeat for 3–4 total pairs.",
        "Resist the urge to shake out on the route — maintain movement throughout.",
      ],
    },
    {
      name: "Aerobic Intervals",
      type: "Aerobic base",
      duration: "20 min",
      steps: [
        "Choose a moderate grade — something you can climb comfortably but that produces a light pump.",
        "Climb for 1 minute on, then rest for 1 minute off. Repeat for 10 rounds.",
        "Track your pump level each round — the goal is to build and then fully recover.",
        "Increase rounds or density as fitness improves over weeks.",
      ],
    },
  ];

  return (
    <>
      <PageHeader eyebrow="Supplemental training" title="Endurance training" description="Manage forearm fatigue and train the right energy systems — not just get tired." />
      <Button variant="ghost" style={{ marginBottom: 24, color: "var(--muted)", gap: 6 }} onClick={onBack}>
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m15 18-6-6 6-6"/></svg>
        Back to overview
      </Button>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 28 }}>
        {types.map((t) => (
          <div key={t.name} style={{ padding: 22, background: "var(--forest)", borderRadius: "var(--radius-md)", color: "white" }}>
            <span className="eyebrow" style={{ color: "var(--moss-light)" }}>Type</span>
            <div className="heading" style={{ marginTop: 10, marginBottom: 8, fontSize: 18, color: "white" }}>{t.name}</div>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "#aeb8ae" }}>{t.desc}</p>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gap: 20 }}>
        {workouts.map((w) => {
          const rounds = w.name === "4×4s" ? 4 : w.name === "Double Laps" ? 3 : w.name === "Aerobic Intervals" ? 10 : 1;
          const workSeconds = w.name === "Continuous ARCing" ? 1200 : w.name === "Aerobic Intervals" ? 60 : w.name === "4×4s" ? 240 : 360;
          const restSeconds = w.name === "4×4s" ? 300 : w.name === "Double Laps" ? 600 : w.name === "Aerobic Intervals" ? 60 : 0;
          const plan: WorkoutPlan = {
            title: w.name,
            duration: w.duration,
            steps: Array.from({ length: rounds }, (_, index) => ({
              title: rounds > 1 ? `${w.name} · Round ${index + 1}` : w.name,
              instructions: w.steps.join(" "),
              workLabel: w.name === "Aerobic Intervals" ? "1 min on" : rounds > 1 ? `Round ${index + 1} of ${rounds}` : w.duration,
              workSeconds,
              restSeconds,
            })),
          };
          return (
          <article key={w.name} className="plan-card">
            <div className="plan-card-top">
              <div className="plan-icon"><Icon name="stopwatch" /></div>
              <span className="tag">{w.type}</span>
            </div>
            <div role="heading" aria-level={3} className="heading" style={{ marginTop: 14, fontSize: 20 }}>{w.name}</div>
            <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--muted)", fontSize: 12, margin: "6px 0 18px" }}><Icon name="clock" size={14} />{w.duration}</span>
            <span className="rest-label"><Icon name="stopwatch" size={14} /> Rest: {restSeconds ? `${Math.round(restSeconds / 60)} min between rounds` : "As needed after completion"}</span>
            <ol className="workout-steps">
              {w.steps.map((step, i) => (
                <li key={i}><span>0{i + 1}</span><div><p style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>{step}</p></div></li>
              ))}
            </ol>
            <Button className="start-plan-button" onClick={() => onStart(plan)}><Icon name="play" size={16} /> Start workout</Button>
          </article>
          );
        })}
      </div>
    </>
  );
}

function Workouts({ grade, onLogged, onWarmup }: { grade: string; onLogged: (log: WorkoutLog) => void; onWarmup: () => void }) {
  const [subView, setSubView] = useState<"strength" | "endurance" | null>(null);
  const [activePlan, setActivePlan] = useState<WorkoutPlan | null>(null);
  const precisionPlan: WorkoutPlan = {
    title: "Precision & movement",
    duration: "55 min",
    steps: [
      { title: "Progressive warm-up", instructions: "Raise your pulse, mobilize shoulders and hips, then climb three easy problems.", workLabel: "10 min", workSeconds: 600, restSeconds: 30 },
      { title: "Silent feet", instructions: "Climb four easy problems without foot noise. Watch each foothold until your toe lands.", workLabel: "4 problems · 15 min", workSeconds: 900, restSeconds: 180 },
      { title: "Limit bouldering", instructions: `Choose three hard problems around ${grade} and above. Make high-quality attempts with full recovery.`, workLabel: "3 projects · 25 min", workSeconds: 1500, restSeconds: 240 },
      { title: "Cool down", instructions: "Finish with easy traversing, relaxed breathing, and gentle forearm mobility.", workLabel: "5 min", workSeconds: 300, restSeconds: 0 },
    ],
  };
  const projectPlan: WorkoutPlan = {
    title: "Project session",
    duration: "70 min",
    steps: [
      { title: "Movement rehearsal", instructions: "Warm up on similar angles, then rehearse the project's key positions at low intensity.", workLabel: "15 min", workSeconds: 900, restSeconds: 180 },
      { title: "Quality attempts", instructions: "Make five focused attempts. Refine one decision after each attempt instead of changing everything.", workLabel: "5 attempts · 35 min", workSeconds: 2100, restSeconds: 300 },
      { title: "Links and finish", instructions: "Practice the hardest link, then finish with two easier confidence-building climbs.", workLabel: "20 min", workSeconds: 1200, restSeconds: 0 },
    ],
  };

  function completePlan() {
    if (!activePlan) return;
    onLogged({ id: Date.now(), title: activePlan.title, date: "Today", duration: activePlan.duration, grade, result: `${activePlan.steps.length} exercises complete` });
    setActivePlan(null);
  }

  if (activePlan) return <GuidedWorkout plan={activePlan} onExit={() => setActivePlan(null)} onComplete={completePlan} />;
  if (subView === "strength") return <StrengthView onBack={() => setSubView(null)} onStart={setActivePlan} />;
  if (subView === "endurance") return <EnduranceView onBack={() => setSubView(null)} onStart={setActivePlan} />;

  return (
    <>
      <PageHeader eyebrow="Train with intent" title="Your workouts" description="Coach-built sessions that adapt to your current grade and goals." />
      <details className="programming-guide">
        <summary><span><Icon name="calendar" size={18} /> Programming guidelines</span><small>Build a balanced, sustainable week</small></summary>
        <div>
          <p><strong>Balance:</strong> Pair 2–3 climbing sessions with no more than 2 strength sessions each week.</p>
          <p><strong>Recover:</strong> Keep at least one full rest day and avoid hard finger training on consecutive days.</p>
          <p><strong>Progress:</strong> Increase either volume or intensity gradually, never both in the same week.</p>
          <p><strong>Adjust:</strong> Stop if pain is sharp or changes your movement. Fatigue is feedback, not a target.</p>
        </div>
      </details>
      <section className="workout-library">
        <article className="featured-workout">
          <div><span className="tag">Best for today</span><Heading>Precision & movement</Heading><p>Build better feet, body awareness, and efficient movement before high-quality attempts.</p><div className="metadata"><span><Icon name="clock" size={17} />55 min</span><span><Icon name="target" size={17} />Technique</span><span>Font {grade}</span></div></div>
          <Button onClick={() => setActivePlan(precisionPlan)}><Icon name="play" size={17} /> Start session</Button>
        </article>
        <div className="workout-options">
          <article className="option-card"><div className="plan-icon"><Icon name="workout" /></div><Heading level={3}>Strength exercises</Heading><p>Climber-focused pulls, pushes, hinges, and core work to build transferable strength.</p><span><Icon name="clock" size={16} />45–60 min</span><Button variant="secondary" onClick={() => setSubView("strength")}>View exercises <Icon name="arrow" size={17} /></Button></article>
          <article className="option-card"><div className="plan-icon"><Icon name="target" /></div><Heading level={3}>Endurance training</Heading><p>ARC, 4×4s, and interval sessions to manage pump and build climbing-specific fitness.</p><span><Icon name="clock" size={16} />20–45 min</span><Button variant="secondary" onClick={() => setSubView("endurance")}>View workouts <Icon name="arrow" size={17} /></Button></article>
          <article className="option-card"><div className="plan-icon"><Icon name="workout" /></div><Heading level={3}>Project session</Heading><p>A structured approach to your project with full recovery between quality attempts.</p><span><Icon name="clock" size={16} />70 min · 3–5 min rest</span><Button variant="secondary" onClick={() => setActivePlan(projectPlan)}><Icon name="play" size={16} /> Start workout</Button></article>
          <article className="option-card option-card-warmup">
            <div className="plan-icon"><Icon name="warmup" /></div>
            <Heading level={3}>Warm-ups</Heading>
            <p>Targeted routines for every body area — fingers, wrists, shoulders, hips, and more.</p>
            <span><Icon name="clock" size={16} />5 – 10 min</span>
            <Button variant="secondary" onClick={onWarmup}>View warm-ups <Icon name="arrow" size={17} /></Button>
          </article>
        </div>
      </section>
    </>
  );
}

function Warmup({ onBack }: { onBack: () => void }) {
  const [area, setArea] = useState<WarmupArea>("Full body");
  const [activePlan, setActivePlan] = useState<WorkoutPlan | null>(null);
  const total = useMemo(() => WARMUPS[area].length * 3, [area]);
  const warmupSteps = WARMUPS[area].map((exercise, index) => {
    const amount = Number(exercise.time.match(/\d+/)?.[0] || 60);
    const workSeconds = exercise.time.includes("min")
      ? amount * 60
      : exercise.time.includes("sec")
        ? amount * (exercise.time.includes("each") ? 2 : 1)
        : 60;
    return {
      title: exercise.title,
      instructions: exercise.note,
      workLabel: exercise.time,
      workSeconds,
      restSeconds: index === WARMUPS[area].length - 1 ? 0 : 30,
    };
  });
  const warmupPlan: WorkoutPlan = { title: `${area} warm-up`, duration: `${total} min`, steps: warmupSteps };

  if (activePlan) return <GuidedWorkout plan={activePlan} onExit={() => setActivePlan(null)} onComplete={() => setActivePlan(null)} />;

  return (
    <>
      <PageHeader eyebrow="Prepare to move" title="Warm-up guide" description="Choose a focus and follow a short, climbing-specific routine." />
      <Button variant="ghost" style={{ marginBottom: 20, color: "var(--muted)", gap: 6 }} onClick={onBack}>
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m15 18-6-6 6-6"/></svg>
        Back to overview
      </Button>
      <div className="warmup-layout">
        <aside className="warmup-categories">
          <span className="eyebrow">Choose an area</span>
          {Object.keys(WARMUPS).map((item) => <Button key={item} variant="ghost" className={area === item ? "active" : ""} onClick={() => setArea(item as WarmupArea)}><span>{item}</span><Icon name="chevron" size={17} /></Button>)}
        </aside>
        <section className="warmup-routine">
          <div className="routine-header"><div><span className="eyebrow">{total} minute routine</span><Heading>{area}</Heading><p>Move within a pain-free range. This should leave you warm, never tired.</p></div><div className="routine-number">0{WARMUPS[area].length}</div></div>
          <div className="exercise-list">
            {WARMUPS[area].map((exercise, index) => (
              <article key={exercise.title} className="exercise-card">
                <span className="exercise-index">0{index + 1}</span>
                <div><Heading level={3}>{exercise.title}</Heading><p>{exercise.note}</p>{index < WARMUPS[area].length - 1 && <small>Rest 30 sec before the next exercise</small>}</div>
                <strong><Icon name="clock" size={16} />{exercise.time}</strong>
              </article>
            ))}
          </div>
          <Button className="wide-button" onClick={() => setActivePlan(warmupPlan)}><Icon name="play" size={17} /> Start guided warm-up</Button>
        </section>
      </div>
    </>
  );
}

function History({ logs }: { logs: WorkoutLog[] }) {
  return (
    <>
      <PageHeader eyebrow="Your progress" title="Workout history" description="Every focused session adds up. Review the work you've done." />
      <section className="history-summary">
        <div><span>Sessions</span><strong>{logs.length}</strong><small>this month</small></div>
        <div><span>Time on wall</span><strong>6.4h</strong><small>+18% from last month</small></div>
        <div><span>Highest send</span><strong>{logs[0]?.grade ?? "—"}</strong><small>Font scale</small></div>
      </section>
      <section className="history-list">
        <div className="section-heading"><Heading level={2}>Recent sessions</Heading></div>
        {logs.map((log) => <article className="history-row" key={log.id}><div className="history-date"><span>{log.date === "Today" ? "24" : log.date.match(/\d+/)?.[0]}</span><small>{log.date === "Today" ? "JUN" : "JUN"}</small></div><div className="history-main"><Heading level={3}>{log.title}</Heading><p>{log.date}</p></div><div className="history-stat"><span>Duration</span><strong>{log.duration}</strong></div><div className="history-stat"><span>Top grade</span><strong>{log.grade}</strong></div><div className="history-stat"><span>Result</span><strong>{log.result}</strong></div><Icon name="chevron" /></article>)}
      </section>
    </>
  );
}

export default function App() {
  const saved = (() => {
    try { return JSON.parse(localStorage.getItem("bouldy-profile") || "null"); } catch { return null; }
  })();
  const [profile, setProfile] = useState<UserProfile | null>(saved);
  const [view, setView] = useState<AppView>("today");
  const [logs, setLogs] = useState<WorkoutLog[]>(STARTER_HISTORY);
  const [showIntro, setShowIntro] = useState(false);
  const [latestAnalysis, setLatestAnalysis] = useState<AnalysisReport | null>(null);

  function complete(p: UserProfile) {
    localStorage.setItem("bouldy-profile", JSON.stringify(p));
    setProfile(p);
  }

  if (!profile) return <Onboarding onComplete={complete} />;
  if (showIntro) return <Onboarding introOnly onComplete={() => setShowIntro(false)} />;

  return (
    <div className="app-shell">
      <Nav view={view} onChange={setView} />
      <main className="main-content">
        {view === "today" && <Today name={profile.name} grade={profile.grade} onChange={setView} />}
        <div className={view === "coach" ? "" : "inactive-view"} aria-hidden={view !== "coach"}>
          <Coach grade={profile.grade} profile={profile} analysis={latestAnalysis} onAnalyze={() => setView("analyze")} />
        </div>
        <div className={view === "analyze" ? "" : "inactive-view"} aria-hidden={view !== "analyze"}>
          <Analyze active={view === "analyze"} onAnalyzed={setLatestAnalysis} />
        </div>
        {view === "workout" && <Workouts grade={profile.grade} onLogged={(log) => { setLogs((current) => [log, ...current]); setView("history"); }} onWarmup={() => setView("warmup")} />}
        {view === "warmup" && <Warmup onBack={() => setView("workout")} />}
        {view === "history" && <History logs={logs} />}
      </main>
      <button className="intro-replay-btn" onClick={() => setShowIntro(true)} aria-label="View intro">🪨</button>
    </div>
  );
}
