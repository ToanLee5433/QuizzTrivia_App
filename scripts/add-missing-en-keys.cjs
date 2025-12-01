/**
 * Script to add missing keys from VI backup to EN
 * This ensures EN has all the keys that were being used in VI
 */

const fs = require('fs');
const path = require('path');

const enPath = path.join(__dirname, '../public/locales/en/common.json');
const viBackupPath = path.join(__dirname, '../public/locales/vi/common.json.backup-sync');

const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const viBackup = JSON.parse(fs.readFileSync(viBackupPath, 'utf8'));

// Keys that need to be added to EN (with English translations)
const missingKeys = {
  multiplayer: {
    errors: {
      gameInProgress: "Game already in progress"
    },
    success: {
      roomCreated: "Room created successfully",
      joinedRoom: "Joined room successfully"
    },
    share: "Share",
    avgScore: "Average Score",
    backToLobby: "Back to Lobby",
    leaveRoom: "Leave Room",
    noMessages: "No messages yet",
    playAgain: "Play Again",
    startConversation: "Start a conversation",
    totalQuestions: "Total Questions",
    totalTime: "Total Time",
    typeMessage: "Type a message...",
    yourResult: "Your Result"
  },
  quiz: {
    difficulty: {
      label: "Difficulty"
    },
    password: {
      required: "Password Required",
      error: "Incorrect password",
      enter: "Enter password"
    },
    publish: {
      currentStatus: "Current Status",
      error: "Publishing error",
      immediate1: "Quiz will be published immediately",
      immediate2: "All users will be able to access it",
      info: "Publish Information",
      notifyUsers: "Notify users about this quiz",
      publishNow: "Publish Now",
      publishing: "Publishing...",
      requireReview: "Require admin review",
      requireReviewDesc: "Quiz must be approved by admin before publishing",
      schedule: "Schedule publish",
      step1: "Review quiz settings",
      step2: "Set visibility options",
      step3: "Configure access permissions",
      step4: "Publish quiz",
      submitReview: "Submit for review",
      title: "Publish Quiz",
      visibility: "Visibility"
    },
    validation: {
      minQuestions: "Quiz must have at least {{min}} questions"
    },
    visibility: {
      password: "Password protected",
      passwordDesc: "Only users with password can access",
      public: "Public",
      publicDesc: "Visible to all users"
    },
    estimatedTime: "Estimated time",
    hasResources: "Has learning resources",
    noCategory: "No category",
    noQuestions: "No questions",
    questionsPreview: "Questions preview",
    quick: "Quick",
    settings: "Settings",
    showResults: "Show results",
    start: "Start",
    total: "Total"
  },
  quizReviews: {
    empty: {
      notFound: "Not found",
      notFoundDesc: "Quiz not found",
      noReviews: "No reviews yet",
      noReviewsDesc: "Be the first to review this quiz",
      writeFirstReview: "Write the first review"
    },
    loading: "Loading reviews...",
    questions: "questions",
    refreshReviews: "Refresh reviews",
    writeReview: "Write a review",
    peopleReviewed: "people reviewed",
    positiveReviews: "positive reviews",
    userReviews: "User Reviews",
    noReviewsYet: "No reviews yet",
    errors: {
      notFound: "Quiz not found",
      loadFailed: "Failed to load reviews",
      pageLoadFailed: "Failed to load page"
    }
  },
  quizCreation: {
    difficultyOptions: {
      easy: "Easy",
      medium: "Medium",
      hard: "Hard"
    },
    bulkImport: {
      toast: {
        success: "Import successful"
      }
    }
  },
  filters: {
    allCategories: "All Categories",
    allDifficulties: "All Difficulties",
    display: "Display",
    grid: "Grid",
    list: "List",
    clearFilters: "Clear Filters"
  },
  learning: {
    gating: {
      notReady: "Not ready"
    },
    locked: "Locked",
    materials: {
      list: "Materials list",
      title: "Learning Materials"
    },
    optional: "Optional",
    progress: "Progress",
    required: "Required",
    selectResource: "Select a resource",
    whyWatch: "Why watch this?"
  },
  roleSelection: {
    canChangeRoleLater: "You can change your role later",
    title: "Choose Your Role",
    subtitle: "Select how you want to use the platform",
    creatorRole: {
      title: "Creator",
      description: "Create and manage quizzes for others",
      features: {
        allUserRights: "All user rights included",
        createQuizzes: "Create and publish quizzes",
        manageQuizzes: "Manage your quizzes",
        needsApproval: "Quizzes need admin approval"
      }
    },
    userRole: {
      title: "User",
      description: "Take quizzes and track your progress",
      features: {
        takeQuizzes: "Take quizzes",
        trackProgress: "Track your progress",
        viewHistory: "View quiz history"
      }
    }
  },
  stats: {
    difficultyDistribution: "Difficulty Distribution",
    goodQuality: "Good quality",
    noCategoryData: "No category data",
    popularCategories: "Popular Categories",
    progress: "Progress"
  },
  quizSettings: {
    timePerQuestion: "Time Per Question",
    timeDesc: "Time limit for each question. Select 'No Limit' for untimed."
  }
};

// Deep merge function
function deepMerge(target, source) {
  const result = { ...target };
  
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(result[key] || {}, source[key]);
    } else if (!(key in result)) {
      // Only add if not exists
      result[key] = source[key];
    }
  }
  
  return result;
}

// Merge missing keys into EN
let addedCount = 0;

for (const key in missingKeys) {
  const before = JSON.stringify(en[key] || {});
  en[key] = deepMerge(en[key] || {}, missingKeys[key]);
  const after = JSON.stringify(en[key]);
  
  if (before !== after) {
    console.log(`✅ Added/merged keys to: ${key}`);
    addedCount++;
  }
}

// Also add multiplayer accessibility and powerUps
if (!en.multiplayer.accessibility) {
  en.multiplayer.accessibility = {
    waitingForHost: "Waiting for host to start the game",
    questionStarted: "Question started",
    questionEnded: "Question ended",
    gameFinished: "Game finished",
    answerSelected: "Answer selected",
    correctAnswer: "Correct answer",
    incorrectAnswer: "Incorrect answer",
    leaderboardUpdated: "Leaderboard updated",
    playerJoined: "Player joined",
    playerLeft: "Player left"
  };
  console.log('✅ Added multiplayer.accessibility');
  addedCount++;
}

if (!en.multiplayer.powerUps) {
  en.multiplayer.powerUps = {
    "5050": "50/50",
    "5050Desc": "Remove two wrong answers",
    x2Score: "Double Points",
    x2ScoreDesc: "Earn double points for this question",
    freezeTime: "Freeze Time",
    freezeTimeDesc: "Stop the timer for 10 seconds",
    used: "Used"
  };
  console.log('✅ Added multiplayer.powerUps');
  addedCount++;
}

// Update chat to include all needed keys
if (en.multiplayer.chat) {
  en.multiplayer.chat = {
    ...en.multiplayer.chat,
    title: "Chat",
    messageCount: "{{count}} messages",
    noMessages: "No messages yet",
    startConversation: "Start a conversation with your team!",
    placeholder: "Type a message...",
    disabled: "Chat is disabled"
  };
  console.log('✅ Updated multiplayer.chat');
}

// Update game to include loading
if (en.multiplayer.game && !en.multiplayer.game.loading) {
  en.multiplayer.game.loading = "Loading game...";
  console.log('✅ Added multiplayer.game.loading');
}

// Write updated EN file
fs.writeFileSync(enPath, JSON.stringify(en, null, 2), 'utf8');

console.log(`\n✅ Updated EN file with ${addedCount} key groups!`);
console.log('📝 Now run sync-i18n-structure.cjs to sync VI with EN');
