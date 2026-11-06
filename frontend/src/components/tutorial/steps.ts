export interface TutorialFlags {
  clerk: boolean;
  supervisor: boolean;
  hod: boolean;
  creator: boolean;
}

export interface TutorialStep {
  title: string;
  text: string;
  /** Page to open first. Left out for items that show on every page, such as the menu. */
  page?: string;
  /** The data-tour value to highlight. Left out for a popup in the middle of the screen. */
  target?: string;
  only?: keyof TutorialFlags;
  /** Hidden for users who hold this role (they get a fuller version of the step). */
  except?: keyof TutorialFlags;
}

const STEPS: TutorialStep[] = [
  {
    page: "/dashboard",
    title: "Welcome to LDMS",
    text: "This tutorial shows you around, one step at a time. It is safe to follow: buttons are locked and nothing will be saved. Click Next to begin.",
  },
  {
    page: "/dashboard",
    target: "dash-tiles",
    title: "Your training summary",
    text: "See your trainings, days and hours. Balance Hours to Complete shows how many hours you still need to reach your 16-hour yearly target.",
  },
  {
    page: "/dashboard",
    target: "dash-dates",
    title: "Choose the dates",
    text: "Change these two dates to see another period. The Dashboard opens on the current year.",
  },
  {
    page: "/dashboard",
    target: "dash-charts",
    title: "Your training mix",
    text: "The chart shows your hours by training type. Beside it are your most recent training records.",
  },
  {
    page: "/dashboard",
    target: "dash-department",
    title: "Hours and department",
    text: "See your hours for each month, how your department is doing against its target, and your top trainers.",
  },
  {
    target: "user-menu",
    title: "Your account",
    text: "Your name and role are here. Click it to Change Password or Sign out. Change the password you were given the first time you sign in.",
  },
  {
    target: "nav:/training",
    title: "My Training",
    text: "Open this to see all your training records. Let's look inside.",
  },
  {
    page: "/training",
    target: "my-stats",
    title: "Your progress",
    text: "Pending trainings are waiting for you. Hours Done only counts trainings marked Complete.",
  },
  {
    page: "/training",
    target: "my-list",
    title: "Your training list",
    text: "Every Public, Inhouse, OJT and E-Learning training you are part of. Click a title for its details, or a column heading to sort.",
  },
  {
    page: "/training",
    target: "my-list",
    title: "Evaluate your training",
    text: "When a row shows Evaluate, click it and answer the questions. The training becomes Complete and its hours count. You can only submit once.",
  },
  {
    page: "/training",
    target: "add-my-ojt",
    title: "Add My OJT",
    text: "Attended On-the-Job Training that nobody keyed in? Add it here yourself. Let's see the form.",
  },
  {
    page: "/training/ojt/new?self=1",
    target: "ojt-title",
    title: "OJT title",
    text: "Type the name of the On-the-Job Training you attended.",
  },
  {
    page: "/training/ojt/new?self=1",
    target: "ojt-venue",
    title: "Venue and trainer type",
    text: "Type where it took place. Choose Internal for a TAMCO trainer, or External for an outside trainer. Then fill in the Trainer Name below.",
  },
  {
    page: "/training/ojt/new?self=1",
    target: "ojt-dates",
    title: "Dates and times",
    text: "Set when the OJT started and ended. LDMS works out the days and hours for you.",
  },
  {
    page: "/training/ojt/new?self=1",
    target: "ojt-survey",
    title: "My Learning Survey",
    text: "Type what you learned, then rate your skill from 1 to 5 before and after the OJT.",
  },
  {
    page: "/training/ojt/new?self=1",
    target: "form-submit",
    title: "Submit your OJT",
    text: "Click Submit OJT, then confirm. It is saved as Complete straight away.",
  },
  {
    only: "clerk",
    page: "/training/ojt",
    target: "ojt-actions",
    title: "Clerk: key in OJT",
    text: "Add OJT creates one session. Upload Excel creates a session with all its participants: use Download Template first, and list each Staff No in column B from row 13.",
  },
  {
    only: "clerk",
    page: "/training/ojt",
    target: "ojt-list",
    title: "Clerk: OJT Records",
    text: "Open an OJT to add participants or show its QR code. Each participant fills in their own evaluation. Use the pencil and bin icons to edit or delete.",
  },
  {
    only: "supervisor",
    page: "/training/pme",
    target: "pme-team",
    title: "Supervisor: My Team",
    text: "Click here to see who reports to you. Ask HR if someone is missing.",
  },
  {
    only: "supervisor",
    page: "/training/pme",
    target: "pme-list",
    title: "Supervisor: PME",
    text: "Evaluate Executives and Managers 3 months after their Public or Inhouse training. The Evaluate button stays locked until then.",
  },
  {
    only: "supervisor",
    page: "/training/pme",
    target: "pme-done",
    title: "Supervisor: finished evaluations",
    text: "Your submitted PMEs move here. They cannot be changed afterwards.",
  },
  {
    page: "/elearning/learner",
    target: "el-search",
    title: "E-Learning",
    text: "Search for a module by name here.",
  },
  {
    page: "/elearning/learner",
    target: "el-modules",
    title: "Take a module",
    text: "Click a module, then Start Module. Finish every lesson and pass every quiz to receive your certificate. The hours are added to your record.",
  },
  {
    only: "creator",
    page: "/elearning/admin",
    target: "el-kpi",
    title: "Creator: Module Analytics",
    text: "Track learners, published modules, certificates and quiz scores. Completion by Module, further down, shows results for each module.",
  },
  {
    only: "creator",
    page: "/elearning/admin/modules/new",
    target: "el-module-form",
    title: "Creator: Create Module",
    text: "Fill this in and save. On the module page, add Slide, Video or Quiz lessons, click Publish Module, then click Assign. Publish before you leave: drafts are not listed in Module Analytics.",
  },
  {
    page: "/requisition",
    target: "req-stats",
    title: "Your applications",
    text: "These totals show your training requests by status.",
  },
  {
    only: "hod",
    page: "/requisition",
    target: "req-pending",
    title: "HOD: approve requests",
    text: "Requests from your staff wait here. Open one, click View Full Details, then Approve or Reject. You can only decide once.",
  },
  {
    page: "/requisition",
    target: "req-mine",
    title: "My Applications",
    text: "Follow each request you submitted. Click one to see its details.",
  },
  {
    page: "/requisition",
    target: "req-new",
    title: "Apply for a training",
    text: "Click New Application to request a training. Your HOD approves or rejects it. Let's see the form.",
  },
  {
    page: "/requisition/new",
    target: "req-participants",
    title: "Participants",
    text: "Search and add each staff member who will attend. At least one is needed.",
  },
  {
    page: "/requisition/new",
    target: "req-title",
    title: "Training title",
    text: "Type the name of the training or course.",
  },
  {
    page: "/requisition/new",
    target: "req-date",
    title: "Training date",
    text: "Click the start date, then click again for the end date. Below it, fill in the times, venue and objective.",
  },
  {
    page: "/requisition/new",
    target: "req-fees",
    title: "Fees and HRDC",
    text: "Enter the fees in RM and choose if it is HRDC claimable. Below it, answer Under ATP, then fill in the Training Provider. Attach the brochure if you have it.",
  },
  {
    page: "/requisition/new",
    target: "form-submit",
    title: "Submit your application",
    text: "Click Submit Application, then confirm. You cannot change it afterwards, so check the details first.",
  },
  {
    except: "hod",
    target: "nav:/tna",
    title: "Training Need Analysis",
    text: "Only Heads of Department submit this. Speak to your HOD if you have training needs to raise.",
  },
  {
    only: "hod",
    page: "/tna",
    target: "tna-scale",
    title: "HOD: Training Need Analysis",
    text: "Submit one TNA a year for your department. Use this table to choose the skill levels from 1 to 5.",
  },
  {
    only: "hod",
    page: "/tna",
    target: "tna-section",
    title: "HOD: add your tasks",
    text: "For each section, fill in the problem, training, skill levels, how it will be achieved and when. Each section allows up to 3 tasks.",
  },
  {
    only: "hod",
    page: "/tna",
    target: "form-submit",
    title: "HOD: submit your TNA",
    text: "Click to submit. You can still change it until HR approves it.",
  },
  {
    title: "You're all set!",
    text: "That's the end of the tutorial. Click the Tutorial button at the top any time to see it again.",
  },
];

export function getTutorialSteps(flags: TutorialFlags) {
  return STEPS.filter((s) => (!s.only || flags[s.only]) && (!s.except || !flags[s.except]));
}
