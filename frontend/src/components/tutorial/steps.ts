export interface TutorialFlags {
  hod: boolean;
}

export interface TutorialStep {
  title: string;
  text: string;
  /** The data-tour value to highlight. Left out for a popup in the middle of the screen. */
  target?: string;
  only?: keyof TutorialFlags;
  /** Hidden for users who hold this role (they get their own version of the step). */
  except?: keyof TutorialFlags;
}

/** One tutorial per page, chosen by the page's address. Steps whose item isn't on the page are skipped. */
const TUTORIALS: { path: RegExp; steps: TutorialStep[] }[] = [
  {
    path: /^\/dashboard$/,
    steps: [
      {
        target: "dash-tiles",
        title: "Your training summary",
        text: "See your trainings, days and hours. Balance Hours to Complete shows how many hours you still need to reach your 16-hour yearly target.",
      },
      {
        target: "dash-dates",
        title: "Choose the dates",
        text: "Change these two dates to see another period. The Dashboard opens on the current year.",
      },
      {
        target: "dash-charts",
        title: "Your training mix",
        text: "The chart shows your hours by training type. Beside it are your most recent training records.",
      },
      {
        target: "dash-department",
        title: "Hours and department",
        text: "See your hours for each month, how your department is doing against its target, and your top trainers.",
      },
      {
        target: "user-menu",
        title: "Your account",
        text: "Your name and role are here. Click it to Change Password or Sign out. Change the password you were given the first time you sign in.",
      },
    ],
  },
  {
    path: /^\/training$/,
    steps: [
      {
        target: "my-stats",
        title: "Your progress",
        text: "Pending trainings are waiting for you. Hours Done only counts trainings marked Complete.",
      },
      {
        target: "my-list",
        title: "Your training list",
        text: "Every Public, Inhouse, OJT and E-Learning training you are part of. Click a title for its details, or a column heading to sort.",
      },
      {
        target: "my-list",
        title: "Evaluate your training",
        text: "When a row shows Evaluate, click it and answer the questions. The training becomes Complete and its hours count. You can only submit once.",
      },
      {
        target: "add-my-ojt",
        title: "Add My OJT",
        text: "Attended On-the-Job Training that nobody keyed in? Click here to add it yourself. The form has its own tutorial.",
      },
    ],
  },
  {
    path: /^\/training\/ojt\/new$/,
    steps: [
      {
        target: "ojt-title",
        title: "OJT title",
        text: "Type the name of the On-the-Job Training.",
      },
      {
        target: "ojt-venue",
        title: "Venue and trainer type",
        text: "Type where it took place. Choose Internal for a TAMCO trainer, or External for an outside trainer. Then fill in the Trainer Name below.",
      },
      {
        target: "ojt-dates",
        title: "Dates and times",
        text: "Set when the OJT started and ended. LDMS works out the days and hours for you.",
      },
      {
        target: "ojt-survey",
        title: "My Learning Survey",
        text: "Type what you learned, then rate your skill from 1 to 5 before and after the OJT. Your OJT is saved as Complete straight away.",
      },
      {
        target: "form-submit",
        title: "Submit your OJT",
        text: "Check your details, click Submit OJT, then confirm.",
      },
    ],
  },
  {
    path: /^\/training\/ojt$/,
    steps: [
      {
        target: "ojt-actions",
        title: "Key in OJT",
        text: "Add OJT creates one session. Upload Excel creates a session with all its participants: use Download Template first, and list each Staff No in column B from row 13.",
      },
      {
        target: "ojt-list",
        title: "OJT Records",
        text: "Open an OJT to add participants or show its QR code. Each participant fills in their own evaluation. Use the pencil and bin icons to edit or delete.",
      },
    ],
  },
  {
    path: /^\/training\/pme$/,
    steps: [
      {
        target: "pme-team",
        title: "My Team",
        text: "Click here to see who reports to you. Ask HR if someone is missing.",
      },
      {
        target: "pme-list",
        title: "Evaluate your team",
        text: "Evaluate Executives and Managers 3 months after their Public or Inhouse training. The Evaluate button stays locked until then.",
      },
      {
        target: "pme-done",
        title: "Finished evaluations",
        text: "Your submitted PMEs move here. They cannot be changed afterwards.",
      },
    ],
  },
  {
    path: /^\/tna$/,
    steps: [
      {
        except: "hod",
        title: "Training Need Analysis",
        text: "Only Heads of Department submit this. Speak to your HOD if you have training needs to raise.",
      },
      {
        only: "hod",
        target: "tna-scale",
        title: "Skill levels",
        text: "Submit one TNA a year for your department. Use this table to choose the skill levels from 1 to 5.",
      },
      {
        only: "hod",
        target: "tna-section",
        title: "Add your tasks",
        text: "For each section, fill in the problem, training, skill levels, how it will be achieved and when. Each section allows up to 3 tasks.",
      },
      {
        only: "hod",
        target: "form-submit",
        title: "Submit your TNA",
        text: "Click to submit. You can still change it until HR approves it.",
      },
    ],
  },
  {
    path: /^\/elearning\/learner$/,
    steps: [
      {
        target: "el-search",
        title: "Find a module",
        text: "Search for a module by name here.",
      },
      {
        target: "el-modules",
        title: "Take a module",
        text: "Click a module, then Start Module. Finish every lesson and pass every quiz to receive your certificate. The hours are added to your record.",
      },
    ],
  },
  {
    path: /^\/elearning\/admin$/,
    steps: [
      {
        target: "el-kpi",
        title: "Module Analytics",
        text: "Track learners, published modules, certificates and quiz scores. Completion by Module, further down, shows results for each module.",
      },
    ],
  },
  {
    path: /^\/elearning\/admin\/modules\/new$/,
    steps: [
      {
        target: "el-module-form",
        title: "Create a module",
        text: "Fill this in and save. On the module page, add Slide, Video or Quiz lessons, click Publish Module, then click Assign. Publish before you leave: drafts are not listed in Module Analytics.",
      },
    ],
  },
  {
    path: /^\/requisition$/,
    steps: [
      {
        target: "req-stats",
        title: "Your applications",
        text: "These totals show your training requests by status.",
      },
      {
        only: "hod",
        target: "req-pending",
        title: "Approve requests",
        text: "Requests from your staff wait here. Open one, click View Full Details, then Approve or Reject. You can only decide once.",
      },
      {
        target: "req-mine",
        title: "My Applications",
        text: "Follow each request you submitted. Click one to see its details.",
      },
      {
        target: "req-new",
        title: "Apply for a training",
        text: "Click New Application to request a training. Your HOD approves or rejects it. The form has its own tutorial.",
      },
    ],
  },
  {
    path: /^\/requisition\/new$/,
    steps: [
      {
        target: "req-participants",
        title: "Participants",
        text: "Search and add each staff member who will attend. At least one is needed.",
      },
      {
        target: "req-title",
        title: "Training title",
        text: "Type the name of the training or course.",
      },
      {
        target: "req-date",
        title: "Training date",
        text: "Click the start date, then click again for the end date. Below it, fill in the times, venue and objective.",
      },
      {
        target: "req-fees",
        title: "Fees and HRDC",
        text: "Enter the fees in RM and choose if it is HRDC claimable. Below it, answer Under ATP, then fill in the Training Provider. Attach the brochure if you have it.",
      },
      {
        target: "form-submit",
        title: "Submit your application",
        text: "Click Submit Application, then confirm. You cannot change it afterwards, so check the details first.",
      },
    ],
  },
];

export function getTutorialSteps(pathname: string, flags: TutorialFlags) {
  const steps = TUTORIALS.find((t) => t.path.test(pathname))?.steps ?? [];
  return steps.filter((s) => (!s.only || flags[s.only]) && (!s.except || !flags[s.except]));
}
