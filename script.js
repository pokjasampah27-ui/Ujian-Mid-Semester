```javascript
/* ================================================================
   APLIKASI UJIAN ONLINE BAHASA INDONESIA
   FRONTEND - GITHUB PAGES
   ================================================================ */

'use strict';

/* ================================================================
   KONFIGURASI
   ================================================================ */

/*
 * GANTI dengan URL Web App Google Apps Script kamu.
 *
 * Contoh:
 * https://script.google.com/macros/s/XXXXXXXXXXXX/exec
 */
const CONFIG = {
  API_URL:
    'https://script.google.com/macros/s/AKfycbyTxIIdNsMgcxCdsD19-LsiWMGUsaMNvzO8BJPPp0OPpcu8WJcOdl4LE0eZI50fxxl7yQ/exec',

  TOTAL_SOAL: 40,

  CLASSES: [
    '12 M1',
    '12 M2',
    '12 M3',
    '12 M4',
    '12 M5'
  ],

  STORAGE_KEYS: {
    EXAM: 'ujian_bahasa_indonesia_exam',
    ADMIN_TOKEN: 'ujian_bahasa_indonesia_admin_token'
  }
};


/* ================================================================
   STATE
   ================================================================ */

const state = {
  questions: [],
  currentQuestion: 0,
  answers: {},
  student: {
    nama: '',
    kelas: '',
    tanggal: ''
  },
  submissionId: '',
  submitted: false,

  admin: {
    token: '',
    loggedIn: false
  },

  results: [],
  statistics: null,
  classStatistics: [],

  loading: false
};


/* ================================================================
   DOM
   ================================================================ */

const DOM = {};


/* ================================================================
   INITIALIZATION
   ================================================================ */

document.addEventListener('DOMContentLoaded', initApp);

async function initApp() {
  cacheDOM();

  setupEventListeners();

  setTodayDate();

  restoreAdminSession();

  renderClassOptions();

  showView('landing');

  updateConnectionStatus('checking');

  await checkApi();

  await loadQuestions();
}


/* ================================================================
   CACHE DOM
   ================================================================ */

function cacheDOM() {
  DOM.app = document.getElementById('app');

  DOM.connectionStatus =
    document.getElementById('connectionStatus');

  DOM.loadingOverlay =
    document.getElementById('loadingOverlay');

  DOM.toastContainer =
    document.getElementById('toastContainer');

  DOM.landingView =
    document.getElementById('landingView');

  DOM.studentView =
    document.getElementById('studentView');

  DOM.examView =
    document.getElementById('examView');

  DOM.resultView =
    document.getElementById('resultView');

  DOM.adminView =
    document.getElementById('adminView');

  DOM.studentForm =
    document.getElementById('studentForm');

  DOM.studentName =
    document.getElementById('studentName');

  DOM.studentClass =
    document.getElementById('studentClass');

  DOM.examDate =
    document.getElementById('examDate');

  DOM.questionContainer =
    document.getElementById('questionContainer');

  DOM.questionNumber =
    document.getElementById('questionNumber');

  DOM.questionType =
    document.getElementById('questionType');

  DOM.questionProgress =
    document.getElementById('questionProgress');

  DOM.progressBar =
    document.getElementById('progressBar');

  DOM.questionNav =
    document.getElementById('questionNav');

  DOM.prevQuestion =
    document.getElementById('prevQuestion');

  DOM.nextQuestion =
    document.getElementById('nextQuestion');

  DOM.submitExam =
    document.getElementById('submitExam');

  DOM.examStudentName =
    document.getElementById('examStudentName');

  DOM.examStudentClass =
    document.getElementById('examStudentClass');

  DOM.resultId =
    document.getElementById('resultId');

  DOM.resultName =
    document.getElementById('resultName');

  DOM.resultClass =
    document.getElementById('resultClass');

  DOM.resultCorrect =
    document.getElementById('resultCorrect');

  DOM.resultWrong =
    document.getElementById('resultWrong');

  DOM.resultScore =
    document.getElementById('resultScore');

  DOM.resultStatus =
    document.getElementById('resultStatus');

  DOM.adminLoginForm =
    document.getElementById('adminLoginForm');

  DOM.adminPin =
    document.getElementById('adminPin');

  DOM.adminDashboard =
    document.getElementById('adminDashboard');

  DOM.adminLoginPanel =
    document.getElementById('adminLoginPanel');

  DOM.adminResultsBody =
    document.getElementById('adminResultsBody');

  DOM.adminTotal =
    document.getElementById('adminTotal');

  DOM.adminAverage =
    document.getElementById('adminAverage');

  DOM.adminHighest =
    document.getElementById('adminHighest');

  DOM.adminLowest =
    document.getElementById('adminLowest');

  DOM.filterClass =
    document.getElementById('filterClass');

  DOM.filterDate =
    document.getElementById('filterDate');

  DOM.filterName =
    document.getElementById('filterName');

  DOM.filterMin =
    document.getElementById('filterMin');

  DOM.filterMax =
    document.getElementById('filterMax');

  DOM.examIdSearch =
    document.getElementById('examIdSearch');

  DOM.examIdResult =
    document.getElementById('examIdResult');

  DOM.classStatisticsBody =
    document.getElementById('classStatisticsBody');

  DOM.confirmModal =
    document.getElementById('confirmModal');

  DOM.confirmMessage =
    document.getElementById('confirmMessage');

  DOM.confirmCancel =
    document.getElementById('confirmCancel');

  DOM.confirmSubmit =
    document.getElementById('confirmSubmit');

  DOM.adminLogout =
    document.getElementById('adminLogout');
}


/* ================================================================
   EVENT LISTENERS
   ================================================================ */

function setupEventListeners() {

  /* Tombol mulai siswa */
  document
    .getElementById('startStudentBtn')
    ?.addEventListener('click', function() {
      showView('student');
    });


  /* Tombol admin */
  document
    .getElementById('adminBtn')
    ?.addEventListener('click', function() {
      if (state.admin.loggedIn) {
        showView('admin');
        loadAdminDashboard();
      } else {
        showView('adminLogin');
      }
    });


  /* Form siswa */
  DOM.studentForm?.addEventListener(
    'submit',
    handleStudentFormSubmit
  );


  /* Navigasi soal */
  DOM.prevQuestion?.addEventListener(
    'click',
    function() {
      goToQuestion(
        state.currentQuestion - 1
      );
    }
  );

  DOM.nextQuestion?.addEventListener(
    'click',
    function() {
      goToQuestion(
        state.currentQuestion + 1
      );
    }
  );


  /* Submit ujian */
  DOM.submitExam?.addEventListener(
    'click',
    openSubmitConfirmation
  );


  /* Konfirmasi */
  DOM.confirmCancel?.addEventListener(
    'click',
    closeConfirmModal
  );

  DOM.confirmSubmit?.addEventListener(
    'click',
    submitExam
  );


  /* Admin login */
  DOM.adminLoginForm?.addEventListener(
    'submit',
    handleAdminLogin
  );


  /* Filter admin */
  document
    .getElementById('applyFilters')
    ?.addEventListener(
      'click',
      loadAdminResults
    );


  document
    .getElementById('resetFilters')
    ?.addEventListener(
      'click',
      resetAdminFilters
    );


  /* Search ID ujian */
  document
    .getElementById('searchExamBtn')
    ?.addEventListener(
      'click',
      searchExamResult
    );


  /* Logout */
  DOM.adminLogout?.addEventListener(
    'click',
    logoutAdmin
  );


  /* Kembali */
  document
    .querySelectorAll('[data-action="home"]')
    .forEach(function(button) {
      button.addEventListener(
        'click',
        function() {
          showView('landing');
        }
      );
    });


  document
    .querySelectorAll('[data-action="student"]')
    .forEach(function(button) {
      button.addEventListener(
        'click',
        function() {
          showView('student');
        }
      );
    });


  document
    .querySelectorAll('[data-action="admin"]')
    .forEach(function(button) {
      button.addEventListener(
        'click',
        function() {
          if (state.admin.loggedIn) {
            showView('admin');
            loadAdminDashboard();
          } else {
            showView('adminLogin');
          }
        }
      );
    });


  /* Keyboard */
  document.addEventListener(
    'keydown',
    handleKeyboardNavigation
  );


  /* Klik modal di luar */
  DOM.confirmModal?.addEventListener(
    'click',
    function(event) {
      if (
        event.target === DOM.confirmModal
      ) {
        closeConfirmModal();
      }
    }
  );
}


/* ================================================================
   API
   ================================================================ */

async function apiGet(action, params = {}) {
  if (
    !CONFIG.API_URL ||
    CONFIG.API_URL.indexOf(
      'GANTI_DENGAN'
    ) === 0
  ) {
    throw new Error(
      'URL Web App Apps Script belum diatur.'
    );
  }

  const url = new URL(CONFIG.API_URL);

  url.searchParams.set(
    'action',
    action
  );

  Object.keys(params).forEach(function(key) {
    const value = params[key];

    if (
      value !== undefined &&
      value !== null &&
      value !== ''
    ) {
      url.searchParams.set(
        key,
        value
      );
    }
  });

  const response =
    await fetch(url.toString(), {
      method: 'GET',
      cache: 'no-store'
    });

  if (!response.ok) {
    throw new Error(
      'Server mengembalikan HTTP ' +
      response.status
    );
  }

  const data =
    await response.json();

  if (!data || typeof data !== 'object') {
    throw new Error(
      'Respons server tidak valid.'
    );
  }

  return data;
}


/*
 * Menggunakan text/plain untuk POST.
 *
 * Ini membantu menghindari preflight CORS
 * yang biasanya muncul jika menggunakan
 * Content-Type application/json.
 *
 * Backend tetap menggunakan:
 * parsePostData_(e)
 */
async function apiPost(action, payload = {}) {
  if (
    !CONFIG.API_URL ||
    CONFIG.API_URL.indexOf(
      'GANTI_DENGAN'
    ) === 0
  ) {
    throw new Error(
      'URL Web App Apps Script belum diatur.'
    );
  }

  const body = Object.assign(
    {},
    payload,
    {
      action: action
    }
  );

  const response =
    await fetch(
      CONFIG.API_URL,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(body)
      }
    );

  if (!response.ok) {
    throw new Error(
      'Server mengembalikan HTTP ' +
      response.status
    );
  }

  const data =
    await response.json();

  if (!data || typeof data !== 'object') {
    throw new Error(
      'Respons server tidak valid.'
    );
  }

  return data;
}


/* ================================================================
   CONNECTION
   ================================================================ */

async function checkApi() {
  try {
    const data =
      await apiGet('ping');

    if (data.success) {
      updateConnectionStatus('online');
    } else {
      updateConnectionStatus('offline');
    }

    return data;
  } catch (error) {
    console.error(error);

    updateConnectionStatus('offline');

    return null;
  }
}


function updateConnectionStatus(status) {
  if (!DOM.connectionStatus) {
    return;
  }

  const label =
    DOM.connectionStatus.querySelector(
     ('.connection-label')
    );

  const dot =
    DOM.connectionStatus.querySelector(
     ('.connection-dot')
    );

  if (status === 'online') {
    DOM.connectionStatus.dataset.status =
      'online';

    if (label) {
      label.textContent =
        'Terhubung';
    }

    if (dot) {
      dot.textContent = '●';
    }

    return;
  }

  if (status === 'checking') {
    DOM.connectionStatus.dataset.status =
      'checking';

    if (label) {
      label.textContent =
        'Menghubungkan...';
    }

    if (dot) {
      dot.textContent = '●';
    }

    return;
  }

  DOM.connectionStatus.dataset.status =
    'offline';

  if (label) {
    label.textContent =
      'Tidak terhubung';
  }

  if (dot) {
    dot.textContent = '●';
  }
}


/* ================================================================
   QUESTIONS
   ================================================================ */

async function loadQuestions() {
  try {
    setLoading(true);

    const data =
      await apiGet('getQuestions');

    if (!data.success) {
      throw new Error(
        data.error ||
        'Soal gagal dimuat.'
      );
    }

    if (
      !Array.isArray(data.questions)
    ) {
      throw new Error(
        'Format soal dari server tidak valid.'
      );
    }

    state.questions =
      data.questions;

    if (
      state.questions.length !==
      CONFIG.TOTAL_SOAL
    ) {
      throw new Error(
        'Server mengirim ' +
        state.questions.length +
        ' soal. Seharusnya ' +
        CONFIG.TOTAL_SOAL +
        ' soal.'
      );
    }

    renderQuestionNav();

  } catch (error) {
    console.error(error);

    showToast(
      error.message ||
      'Soal gagal dimuat.',
      'error'
    );

  } finally {
    setLoading(false);
  }
}


/* ================================================================
   CLASS
   ================================================================ */

function renderClassOptions() {
  const selects = [
    DOM.studentClass,
    DOM.filterClass
  ];

  selects.forEach(function(select) {
    if (!select) {
      return;
    }

    const isFilter =
      select === DOM.filterClass;

    select.innerHTML = '';

    if (isFilter) {
      select.appendChild(
        createOption(
          'SEMUA',
          'Semua kelas'
        )
      );
    } else {
      select.appendChild(
        createOption(
          '',
          'Pilih kelas'
        )
      );
    }

    CONFIG.CLASSES.forEach(function(kelas) {
      select.appendChild(
        createOption(
          kelas,
          kelas
        )
      );
    });
  });
}


function createOption(value, text) {
  const option =
    document.createElement('option');

  option.value = value;
  option.textContent = text;

  return option;
}


/* ================================================================
   DATE
   ================================================================ */

function setTodayDate() {
  if (!DOM.examDate) {
    return;
  }

  const now =
    new Date();

  const day =
    String(
      now.getDate()
    ).padStart(2, '0');

  const month =
    String(
      now.getMonth() + 1
    ).padStart(2, '0');

  const year =
    now.getFullYear();

  /*
   * Input type=date membutuhkan YYYY-MM-DD.
   */
  DOM.examDate.value =
    year +
    '-' +
    month +
    '-' +
    day;
}


function convertDateToBackend(
  isoDate
) {
  if (!isoDate) {
    return '';
  }

  const match =
    isoDate.match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );

  if (!match) {
    return isoDate;
  }

  return (
    match[3] +
    '-' +
    match[2] +
    '-' +
    match[1]
  );
}


/* ================================================================
   STUDENT FORM
   ================================================================ */

async function handleStudentFormSubmit(event) {
  event.preventDefault();

  const nama =
    DOM.studentName.value.trim();

  const kelas =
    DOM.studentClass.value;

  const tanggal =
    DOM.examDate.value;

  if (!nama) {
    showToast(
      'Nama lengkap wajib diisi.',
      'warning'
    );

    DOM.studentName.focus();

    return;
  }

  if (!kelas) {
    showToast(
      'Silakan pilih kelas.',
      'warning'
    );

    DOM.studentClass.focus();

    return;
  }

  if (!tanggal) {
    showToast(
      'Tanggal ujian wajib diisi.',
      'warning'
    );

    DOM.examDate.focus();

    return;
  }

  if (
    state.questions.length !==
    CONFIG.TOTAL_SOAL
  ) {
    showToast(
      'Soal belum siap. Tunggu sebentar.',
      'warning'
    );

    await loadQuestions();

    if (
      state.questions.length !==
      CONFIG.TOTAL_SOAL
    ) {
      return;
    }
  }

  state.student = {
    nama: nama,
    kelas: kelas,
    tanggal: tanggal
  };

  state.answers = {};
  state.currentQuestion = 0;
  state.submitted = false;

  state.submissionId =
    createSubmissionId();

  saveExamToStorage();

  prepareExamScreen();

  showView('exam');
}


/* ================================================================
   SUBMISSION ID
   ================================================================ */

function createSubmissionId() {
  const timestamp =
    Date.now();

  const random =
    Math.random()
      .toString(36)
      .substring(2, 10);

  return (
    'SUB-' +
    timestamp +
    '-' +
    random
  );
}


/* ================================================================
   EXAM
   ================================================================ */

function prepareExamScreen() {
  DOM.examStudentName.textContent =
    state.student.nama;

  DOM.examStudentClass.textContent =
    state.student.kelas;

  renderQuestionNav();

  renderCurrentQuestion();

  updateExamProgress();
}


function renderCurrentQuestion() {
  if (
    !state.questions.length
  ) {
    return;
  }

  const question =
    state.questions[
      state.currentQuestion
    ];

  if (!question) {
    return;
  }

  DOM.questionNumber.textContent =
    'Soal ' + question.no;

  DOM.questionType.textContent =
    getQuestionTypeLabel(
      question.bentuk
    );

  DOM.questionContainer.innerHTML = '';

  const wrapper =
    document.createElement('div');

  wrapper.className =
    'question-card';


  /* Stimulus */
  if (question.stimulus) {
    const stimulus =
      document.createElement('div');

    stimulus.className =
      'question-stimulus';

    const title =
      document.createElement('div');

    title.className =
      'stimulus-title';

    title.textContent =
      '📖 Stimulus';

    const text =
      document.createElement('div');

    text.className =
      'stimulus-text';

    text.textContent =
      question.stimulus;

    stimulus.appendChild(title);
    stimulus.appendChild(text);

    wrapper.appendChild(stimulus);
  }


  /* Pertanyaan */
  const questionText =
    document.createElement('div');

  questionText.className =
    'question-text';

  questionText.textContent =
    question.pertanyaan;

  wrapper.appendChild(
    questionText
  );


  /* Pilihan */
  const choices =
    document.createElement('div');

  choices.className =
    'answer-choices';

  const type =
    normalizeQuestionType(
      question.bentuk
    );

  if (type === 'PG') {
    renderPGChoices(
      choices,
      question
    );
  }

  if (type === 'PGK') {
    renderPGKChoices(
      choices,
      question
    );
  }

  if (type === 'B/S') {
    renderTrueFalseChoices(
      choices,
      question
    );
  }

  wrapper.appendChild(
    choices
  );

  DOM.questionContainer.appendChild(
    wrapper
  );

  updateNavigationButtons();

  updateQuestionNavActive();
}


/* ================================================================
   PG
   ================================================================ */

function renderPGChoices(
  container,
  question
) {
  const saved =
    state.answers[
      String(question.no)
    ] || '';

  ['A', 'B', 'C', 'D']
    .forEach(function(letter) {

      const value =
        question.pilihan?.[letter] || '';

      const label =
        document.createElement('label');

      label.className =
        'answer-option';

      if (saved === letter) {
        label.classList.add('selected');
      }

      const input =
        document.createElement('input');

      input.type = 'radio';
      input.name =
        'question_' + question.no;

      input.value =
        letter;

      input.checked =
        saved === letter;

      input.addEventListener(
        'change',
        function() {
          saveSingleAnswer(
            question.no,
            letter
          );
        }
      );

      const badge =
        document.createElement('span');

      badge.className =
        'choice-letter';

      badge.textContent =
        letter;

      const text =
        document.createElement('span');

      text.className =
        'choice-text';

      text.textContent =
        value;

      label.appendChild(input);
      label.appendChild(badge);
      label.appendChild(text);

      container.appendChild(label);
    });
}


/* ================================================================
   PG KOMPLEKS
   ================================================================ */

function renderPGKChoices(
  container,
  question
) {
  const saved =
    getSavedAnswerArray(
      question.no
    );

  const instruction =
    document.createElement('div');

  instruction.className =
    'answer-instruction';

  instruction.innerHTML =
    '<strong>Pilihan Ganda Kompleks</strong>' +
    '<span>Pilih semua jawaban yang benar.</span>';

  container.appendChild(
    instruction
  );

  ['A', 'B', 'C', 'D']
    .forEach(function(letter) {

      const value =
        question.pilihan?.[letter] || '';

      const label =
        document.createElement('label');

      label.className =
        'answer-option checkbox-option';

      if (
        saved.indexOf(letter) !== -1
      ) {
        label.classList.add('selected');
      }

      const input =
        document.createElement('input');

      input.type = 'checkbox';

      input.name =
        'question_' + question.no;

      input.value =
        letter;

      input.checked =
        saved.indexOf(letter) !== -1;

      input.addEventListener(
        'change',
        function() {

          const selected =
            Array.from(
              container.querySelectorAll(
                'input[type="checkbox"]:checked'
              )
            ).map(
              function(item) {
                return item.value;
              }
            );

          selected.sort();

          state.answers[
            String(question.no)
          ] = selected;

          label.classList.toggle(
            'selected',
            input.checked
          );

          updateExamProgress();
          updateQuestionNav();
          saveExamToStorage();
        }
      );

      const badge =
        document.createElement('span');

      badge.className =
        'choice-letter';

      badge.textContent =
        letter;

      const text =
        document.createElement('span');

      text.className =
        'choice-text';

      text.textContent =
        value;

      label.appendChild(input);
      label.appendChild(badge);
      label.appendChild(text);

      container.appendChild(label);
    });
}


/* ================================================================
   BENAR SALAH
   ================================================================ */

function renderTrueFalseChoices(
  container,
  question
) {
  const saved =
    String(
      state.answers[
        String(question.no)
      ] || ''
    ).toUpperCase();

  const instruction =
    document.createElement('div');

  instruction.className =
    'answer-instruction';

  instruction.innerHTML =
    '<strong>Benar atau Salah?</strong>' +
    '<span>Pilih salah satu jawaban.</span>';

  container.appendChild(
    instruction
  );

  [
    {
      value: 'BENAR',
      label: 'Benar',
      icon: '✓'
    },
    {
      value: 'SALAH',
      label: 'Salah',
      icon: '✕'
    }
  ].forEach(function(item) {

    const label =
      document.createElement('label');

    label.className =
      'answer-option true-false-option';

    if (saved === item.value) {
      label.classList.add('selected');
    }

    const input =
      document.createElement('input');

    input.type = 'radio';

    input.name =
      'question_' + question.no;

    input.value =
      item.value;

    input.checked =
      saved === item.value;

    input.addEventListener(
      'change',
      function() {
        saveSingleAnswer(
          question.no,
          item.value
        );
      }
    );

    const icon =
      document.createElement('span');

    icon.className =
      'tf-icon';

    icon.textContent =
      item.icon;

    const text =
      document.createElement('span');

    text.className =
      'choice-text';

    text.textContent =
      item.label;

    label.appendChild(input);
    label.appendChild(icon);
    label.appendChild(text);

    container.appendChild(label);
  });
}


/* ================================================================
   ANSWER
   ================================================================ */

function saveSingleAnswer(
  questionNumber,
  answer
) {
  state.answers[
    String(questionNumber)
  ] = answer;

  updateExamProgress();
  updateQuestionNav();

  saveExamToStorage();
}


function getSavedAnswerArray(
  questionNumber
) {
  const answer =
    state.answers[
      String(questionNumber)
    ];

  if (Array.isArray(answer)) {
    return answer.slice();
  }

  if (!answer) {
    return [];
  }

  return String(answer)
    .split('')
    .filter(function(item) {
      return /^[ABCD]$/.test(item);
    });
}


/* ================================================================
   QUESTION NAVIGATION
   ================================================================ */

function renderQuestionNav() {
  if (!DOM.questionNav) {
    return;
  }

  DOM.questionNav.innerHTML = '';

  state.questions.forEach(
    function(question, index) {

      const button =
        document.createElement('button');

      button.type = 'button';

      button.className =
        'question-nav-item';

      button.textContent =
        question.no;

      button.dataset.index =
        index;

      button.addEventListener(
        'click',
        function() {
          goToQuestion(index);
        }
      );

      DOM.questionNav.appendChild(
        button
      );
    }
  );

  updateQuestionNav();
}


function updateQuestionNav() {
  if (!DOM.questionNav) {
    return;
  }

  const buttons =
    DOM.questionNav.querySelectorAll(
      '.question-nav-item'
    );

  buttons.forEach(
    function(button, index) {

      const question =
        state.questions[index];

      const answer =
        state.answers[
          String(question.no)
        ];

      button.classList.toggle(
        'active',
        index === state.currentQuestion
      );

      button.classList.toggle(
        'answered',
        hasAnswer(answer)
      );
    }
  );
}


function updateQuestionNavActive() {
  updateQuestionNav();
}


function goToQuestion(index) {
  if (
    index < 0 ||
    index >= state.questions.length
  ) {
    return;
  }

  state.currentQuestion =
    index;

  renderCurrentQuestion();

  updateExamProgress();

  const examTop =
    document.getElementById(
      'examTop'
    );

  if (examTop) {
    examTop.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }
}


/* ================================================================
   NAVIGATION BUTTONS
   ================================================================ */

function updateNavigationButtons() {
  if (DOM.prevQuestion) {
    DOM.prevQuestion.disabled =
      state.currentQuestion === 0;
  }

  const last =
    state.questions.length - 1;

  if (DOM.nextQuestion) {
    DOM.nextQuestion.disabled =
      state.currentQuestion >= last;
  }

  if (DOM.submitExam) {
    DOM.submitExam.classList.toggle(
      'hidden',
      state.currentQuestion !== last
    );
  }
}


/* ================================================================
   PROGRESS
   ================================================================ */

function updateExamProgress() {
  const total =
    state.questions.length;

  const answered =
    state.questions.filter(
      function(question) {
        return hasAnswer(
          state.answers[
            String(question.no)
          ]
        );
      }
    ).length;

  const percentage =
    total
      ? Math.round(
          (answered / total) * 100
        )
      : 0;

  if (DOM.questionProgress) {
    DOM.questionProgress.textContent =
      answered +
      ' / ' +
      total +
      ' dijawab';
  }

  if (DOM.progressBar) {
    DOM.progressBar.style.width =
      percentage + '%';
  }
}


/* ================================================================
   ANSWER CHECK
   ================================================================ */

function hasAnswer(answer) {
  if (Array.isArray(answer)) {
    return answer.length > 0;
  }

  return (
    answer !== undefined &&
    answer !== null &&
    String(answer).trim() !== ''
  );
}


/* ================================================================
   SUBMIT
   ================================================================ */

function openSubmitConfirmation() {
  const total =
    state.questions.length;

  const answered =
    state.questions.filter(
      function(question) {
        return hasAnswer(
          state.answers[
            String(question.no)
          ]
        );
      }
    ).length;

  const unanswered =
    total - answered;

  if (unanswered > 0) {
    DOM.confirmMessage.innerHTML =
      '<strong>Masih ada ' +
      unanswered +
      ' soal yang belum dijawab.</strong>' +
      '<br><br>' +
      'Apakah kamu tetap ingin mengirim ujian?';
  } else {
    DOM.confirmMessage.innerHTML =
      '<strong>Semua soal sudah dijawab.</strong>' +
      '<br><br>' +
      'Yakin ingin mengirim jawaban sekarang?';
  }

  DOM.confirmModal.classList.add(
    'show'
  );
}


function closeConfirmModal() {
  DOM.confirmModal.classList.remove(
    'show'
  );
}


/* ================================================================
   SUBMIT EXAM API
   ================================================================ */

async function submitExam() {
  if (state.submitted) {
    return;
  }

  closeConfirmModal();

  try {
    setLoading(
      true,
      'Menyimpan jawaban ujian...'
    );

    const payload = {
      nama: state.student.nama,

      kelas: state.student.kelas,

      tanggal:
        convertDateToBackend(
          state.student.tanggal
        ),

      submissionId:
        state.submissionId,

      answers:
        state.answers
    };

    const data =
      await apiPost(
        'submitExam',
        payload
      );

    if (!data.success) {
      throw new Error(
        data.error ||
        'Ujian gagal dikirim.'
      );
    }

    state.submitted = true;

    clearExamStorage();

    showResult(
      data.result,
      data.duplicate
    );

    showView('result');

  } catch (error) {
    console.error(error);

    showToast(
      error.message ||
      'Ujian gagal dikirim.',
      'error'
    );

  } finally {
    setLoading(false);
  }
}


/* ================================================================
   RESULT
   ================================================================ */

function showResult(
  result,
  duplicate
) {
  if (!result) {
    return;
  }

  DOM.resultId.textContent =
    result.idUjian || '-';

  DOM.resultName.textContent =
    result.nama || '-';

  DOM.resultClass.textContent =
    result.kelas || '-';

  DOM.resultCorrect.textContent =
    result.benar ?? 0;

  DOM.resultWrong.textContent =
    result.salah ?? 0;

  DOM.resultScore.textContent =
    formatScore(
      result.nilai
    );

  DOM.resultStatus.textContent =
    result.status || 'SELESAI';

  const resultBadge =
    document.getElementById(
      'resultBadge'
    );

  if (resultBadge) {
    resultBadge.textContent =
      duplicate
        ? '✓ Sudah tersimpan'
        : '✓ Ujian selesai';
  }
}


/* ================================================================
   ADMIN LOGIN
   ================================================================ */

async function handleAdminLogin(event) {
  event.preventDefault();

  const pin =
    DOM.adminPin.value.trim();

  if (!pin) {
    showToast(
      'PIN Admin wajib diisi.',
      'warning'
    );

    DOM.adminPin.focus();

    return;
  }

  try {
    setLoading(
      true,
      'Memverifikasi PIN Admin...'
    );

    const data =
      await apiPost(
        'adminAuth',
        {
          pin: pin
        }
      );

    if (!data.success) {
      throw new Error(
        data.error ||
        'Login Admin gagal.'
      );
    }

    if (!data.token) {
      throw new Error(
        'Token Admin tidak diterima.'
      );
    }

    state.admin.token =
      data.token;

    state.admin.loggedIn =
      true;

    sessionStorage.setItem(
      CONFIG.STORAGE_KEYS.ADMIN_TOKEN,
      data.token
    );

    DOM.adminPin.value = '';

    showToast(
      'Login Admin berhasil.',
      'success'
    );

    showView('admin');

    await loadAdminDashboard();

  } catch (error) {
    console.error(error);

    showToast(
      error.message ||
      'Login Admin gagal.',
      'error'
    );

  } finally {
    setLoading(false);
  }
}


/* ================================================================
   ADMIN SESSION
   ================================================================ */

function restoreAdminSession() {
  const token =
    sessionStorage.getItem(
      CONFIG.STORAGE_KEYS.ADMIN_TOKEN
    );

  if (!token) {
    return;
  }

  state.admin.token =
    token;

  state.admin.loggedIn =
    true;
}


function logoutAdmin() {
  state.admin.token = '';
  state.admin.loggedIn = false;

  sessionStorage.removeItem(
    CONFIG.STORAGE_KEYS.ADMIN_TOKEN
  );

  showToast(
    'Kamu telah keluar dari Admin.',
    'success'
  );

  showView('landing');
}


/* ================================================================
   ADMIN DASHBOARD
   ================================================================ */

async function loadAdminDashboard() {
  if (!state.admin.loggedIn) {
    showView('adminLogin');
    return;
  }

  DOM.adminLoginPanel?.classList.add(
    'hidden'
  );

  DOM.adminDashboard?.classList.remove(
    'hidden'
  );

  await Promise.all([
    loadAdminResults(),
    loadStatistics(),
    loadClassStatistics()
  ]);
}


/* ================================================================
   ADMIN RESULTS
   ================================================================ */

async function loadAdminResults() {
  if (!state.admin.loggedIn) {
    return;
  }

  try {
    setLoading(
      true,
      'Memuat hasil ujian...'
    );

    const params = {
      token:
        state.admin.token,

      kelas:
        DOM.filterClass?.value || 'SEMUA',

      tanggal:
        DOM.filterDate?.value || '',

      nama:
        DOM.filterName?.value || '',

      nilaiMin:
        DOM.filterMin?.value || '',

      nilaiMax:
        DOM.filterMax?.value || ''
    };

    const data =
      await apiGet(
        'getAdminResults',
        params
      );

    if (
      data.unauthorized
    ) {
      handleAdminUnauthorized();
      return;
    }

    if (!data.success) {
      throw new Error(
        data.error ||
        'Hasil ujian gagal dimuat.'
      );
    }

    state.results =
      Array.isArray(data.results)
        ? data.results
        : [];

    renderAdminResults();

  } catch (error) {
    console.error(error);

    showToast(
      error.message ||
      'Gagal memuat hasil.',
      'error'
    );

  } finally {
    setLoading(false);
  }
}


/* ================================================================
   ADMIN RESULTS TABLE
   ================================================================ */

function renderAdminResults() {
  if (!DOM.adminResultsBody) {
    return;
  }

  DOM.adminResultsBody.innerHTML = '';

  if (!state.results.length) {
    const row =
      document.createElement('tr');

    row.innerHTML =
      '<td colspan="10" class="empty-table">' +
      'Belum ada hasil yang sesuai dengan filter.' +
      '</td>';

    DOM.adminResultsBody.appendChild(
      row
    );

    return;
  }

  state.results.forEach(
    function(result, index) {

      const row =
        document.createElement('tr');

      row.innerHTML = `
        <td>${index + 1}</td>
        <td>
          <strong>${escapeHTML(
            result.idUjian
          )}</strong>
        </td>
        <td>${escapeHTML(
          result.tanggal || '-'
        )}</td>
        <td class="student-name-cell">
          ${escapeHTML(
            result.nama || '-'
          )}
        </td>
        <td>
          <span class="class-badge">
            ${escapeHTML(
              result.kelas || '-'
            )}
          </span>
        </td>
        <td>${result.totalSoal ?? 0}</td>
        <td class="correct-cell">
          ${result.benar ?? 0}
        </td>
        <td class="wrong-cell">
          ${result.salah ?? 0}
        </td>
        <td>
          <span class="score-badge ${getScoreClass(
            result.nilai
          )}">
            ${formatScore(
              result.nilai
            )}
          </span>
        </td>
        <td>
          <span class="status-badge">
            ${escapeHTML(
              result.status || '-'
            )}
          </span>
        </td>
      `;

      DOM.adminResultsBody.appendChild(
        row
      );
    }
  );
}


/* ================================================================
   STATISTICS
   ================================================================ */

async function loadStatistics() {
  if (!state.admin.loggedIn) {
    return;
  }

  try {
    const params = {
      token:
        state.admin.token,

      kelas:
        DOM.filterClass?.value || 'SEMUA',

      tanggal:
        DOM.filterDate?.value || '',

      nama:
        DOM.filterName?.value || '',

      nilaiMin:
        DOM.filterMin?.value || '',

      nilaiMax:
        DOM.filterMax?.value || ''
    };

    const data =
      await apiGet(
        'getStatistics',
        params
      );

    if (
      data.unauthorized
    ) {
      handleAdminUnauthorized();
      return;
    }

    if (!data.success) {
      throw new Error(
        data.error ||
        'Statistik gagal dimuat.'
      );
    }

    state.statistics =
      data.statistics;

    renderStatistics();

  } catch (error) {
    console.error(error);

    showToast(
      error.message ||
      'Statistik gagal dimuat.',
      'error'
    );
  }
}


function renderStatistics() {
  const stats =
    state.statistics;

  if (!stats) {
    return;
  }

  if (DOM.adminTotal) {
    DOM.adminTotal.textContent =
      stats.totalPeserta ?? 0;
  }

  if (DOM.adminAverage) {
    DOM.adminAverage.textContent =
      formatScore(
        stats.rataRata
      );
  }

  if (DOM.adminHighest) {
    DOM.adminHighest.textContent =
      formatScore(
        stats.nilaiTertinggi
      );
  }

  if (DOM.adminLowest) {
    DOM.adminLowest.textContent =
      formatScore(
        stats.nilaiTerendah
      );
  }
}


/* ================================================================
   CLASS STATISTICS
   ================================================================ */

async function loadClassStatistics() {
  if (!state.admin.loggedIn) {
    return;
  }

  try {
    const data =
      await apiGet(
        'getClassStatistics',
        {
          token:
            state.admin.token,

          tanggal:
            DOM.filterDate?.value || ''
        }
      );

    if (
      data.unauthorized
    ) {
      handleAdminUnauthorized();
      return;
    }

    if (!data.success) {
      throw new Error(
        data.error ||
        'Statistik kelas gagal dimuat.'
      );
    }

    state.classStatistics =
      Array.isArray(data.statistics)
        ? data.statistics
        : [];

    renderClassStatistics();

  } catch (error) {
    console.error(error);

    showToast(
      error.message ||
      'Statistik kelas gagal dimuat.',
      'error'
    );
  }
}


function renderClassStatistics() {
  if (!DOM.classStatisticsBody) {
    return;
  }

  DOM.classStatisticsBody.innerHTML = '';

  state.classStatistics.forEach(
    function(item) {

      const row =
        document.createElement('tr');

      row.innerHTML = `
        <td>
          <span class="class-badge">
            ${escapeHTML(
              item.kelas || '-'
            )}
          </span>
        </td>

        <td>
          ${item.peserta ?? 0}
        </td>

        <td>
          ${formatScore(
            item.rataRata
          )}
        </td>

        <td>
          ${formatScore(
            item.tertinggi
          )}
        </td>

        <td>
          ${formatScore(
            item.terendah
          )}
        </td>
      `;

      DOM.classStatisticsBody.appendChild(
        row
      );
    }
  );
}


/* ================================================================
   SEARCH EXAM
   ================================================================ */

async function searchExamResult() {
  const id =
    DOM.examIdSearch.value.trim();

  if (!id) {
    showToast(
      'Masukkan ID ujian.',
      'warning'
    );

    DOM.examIdSearch.focus();

    return;
  }

  try {
    setLoading(
      true,
      'Mencari hasil ujian...'
    );

    const data =
      await apiGet(
        'getExamResult',
        {
          idUjian: id
        }
      );

    if (!data.success) {
      throw new Error(
        data.error ||
        'Hasil ujian tidak ditemukan.'
      );
    }

    renderExamSearchResult(
      data.result
    );

  } catch (error) {
    console.error(error);

    DOM.examIdResult.innerHTML =
      '<div class="search-empty error-state">' +
      escapeHTML(
        error.message ||
        'Hasil tidak ditemukan.'
      ) +
      '</div>';

  } finally {
    setLoading(false);
  }
}


function renderExamSearchResult(
  result
) {
  if (!DOM.examIdResult) {
    return;
  }

  DOM.examIdResult.innerHTML = `
    <div class="search-result-card">
      <div class="search-result-header">
        <span>ID Ujian</span>
        <strong>${escapeHTML(
          result.idUjian || '-'
        )}</strong>
      </div>

      <div class="search-result-grid">

        <div>
          <small>Nama</small>
          <strong>${escapeHTML(
            result.nama || '-'
          )}</strong>
        </div>

        <div>
          <small>Kelas</small>
          <strong>${escapeHTML(
            result.kelas || '-'
          )}</strong>
        </div>

        <div>
          <small>Tanggal</small>
          <strong>${escapeHTML(
            result.tanggal || '-'
          )}</strong>
        </div>

        <div>
          <small>Benar</small>
          <strong>${result.benar ?? 0}</strong>
        </div>

        <div>
          <small>Salah</small>
          <strong>${result.salah ?? 0}</strong>
        </div>

        <div>
          <small>Nilai</small>
          <strong class="big-score">
            ${formatScore(
              result.nilai
            )}
          </strong>
        </div>

      </div>
    </div>
  `;
}


/* ================================================================
   ADMIN FILTER
   ================================================================ */

function resetAdminFilters() {
  if (DOM.filterClass) {
    DOM.filterClass.value =
      'SEMUA';
  }

  if (DOM.filterDate) {
    DOM.filterDate.value =
      '';
  }

  if (DOM.filterName) {
    DOM.filterName.value =
      '';
  }

  if (DOM.filterMin) {
    DOM.filterMin.value =
      '';
  }

  if (DOM.filterMax) {
    DOM.filterMax.value =
      '';
  }

  loadAdminDashboard();
}


function handleAdminUnauthorized() {
  state.admin.token = '';
  state.admin.loggedIn = false;

  sessionStorage.removeItem(
    CONFIG.STORAGE_KEYS.ADMIN_TOKEN
  );

  showToast(
    'Sesi Admin telah berakhir. Silakan login kembali.',
    'warning'
  );

  showView('adminLogin');
}


/* ================================================================
   VIEW
   ================================================================ */

function showView(view) {
  const views = {
    landing:
      DOM.landingView,

    student:
      DOM.studentView,

    exam:
      DOM.examView,

    result:
      DOM.resultView,

    adminLogin:
      DOM.adminLoginPanel,

    admin:
      DOM.adminView
  };

  Object.keys(views).forEach(
    function(key) {
      const element =
        views[key];

      if (!element) {
        return;
      }

      element.classList.toggle(
        'active-view',
        key === view
      );

      element.classList.toggle(
        'hidden',
        key !== view
      );
    }
  );

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}


/* ================================================================
   STORAGE
   ================================================================ */

function saveExamToStorage() {
  try {
    const data = {
      student:
        state.student,

      answers:
        state.answers,

      currentQuestion:
        state.currentQuestion,

      submissionId:
        state.submissionId
    };

    sessionStorage.setItem(
      CONFIG.STORAGE_KEYS.EXAM,
      JSON.stringify(data)
    );
  } catch (error) {
    console.warn(
      'Gagal menyimpan sesi ujian.',
      error
    );
  }
}


function restoreExamFromStorage() {
  try {
    const raw =
      sessionStorage.getItem(
        CONFIG.STORAGE_KEYS.EXAM
      );

    if (!raw) {
      return false;
    }

    const data =
      JSON.parse(raw);

    if (
      !data ||
      !data.student ||
      !data.submissionId
    ) {
      return false;
    }

    state.student =
      data.student;

    state.answers =
      data.answers || {};

    state.currentQuestion =
      Number(
        data.currentQuestion
      ) || 0;

    state.submissionId =
      data.submissionId;

    return true;

  } catch (error) {
    console.warn(
      'Sesi ujian tidak dapat dipulihkan.',
      error
    );

    return false;
  }
}


function clearExamStorage() {
  sessionStorage.removeItem(
    CONFIG.STORAGE_KEYS.EXAM
  );
}


/* ================================================================
   KEYBOARD
   ================================================================ */

function handleKeyboardNavigation(event) {
  if (
    !DOM.examView ||
    DOM.examView.classList.contains('hidden')
  ) {
    return;
  }

  /*
   * Jangan mengambil alih keyboard
   * saat siswa sedang mengetik.
   */
  const tag =
    document.activeElement?.tagName;

  if (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT'
  ) {
    return;
  }

  if (event.key === 'ArrowLeft') {
    goToQuestion(
      state.currentQuestion - 1
    );
  }

  if (event.key === 'ArrowRight') {
    goToQuestion(
      state.currentQuestion + 1
    );
  }
}


/* ================================================================
   QUESTION TYPE
   ================================================================ */

function normalizeQuestionType(value) {
  const text =
    String(
      value || ''
    )
    .trim()
    .toUpperCase();

  if (
    text === 'PG' ||
    text === 'PILIHAN GANDA'
  ) {
    return 'PG';
  }

  if (
    text === 'PGK' ||
    text === 'PILIHAN GANDA KOMPLEKS'
  ) {
    return 'PGK';
  }

  if (
    text === 'B/S' ||
    text === 'BS' ||
    text === 'BENAR/SALAH' ||
    text === 'BENAR SALAH'
  ) {
    return 'B/S';
  }

  return text;
}


function getQuestionTypeLabel(type) {
  const normalized =
    normalizeQuestionType(type);

  if (normalized === 'PG') {
    return 'Pilihan Ganda';
  }

  if (normalized === 'PGK') {
    return 'Pilihan Ganda Kompleks';
  }

  if (normalized === 'B/S') {
    return 'Benar / Salah';
  }

  return normalized;
}


/* ================================================================
   LOADING
   ================================================================ */

function setLoading(
  visible,
  message
) {
  state.loading =
    visible;

  if (!DOM.loadingOverlay) {
    return;
  }

  if (message) {
    const text =
      DOM.loadingOverlay.querySelector(
        '.loading-text'
      );

    if (text) {
      text.textContent =
        message;
    }
  }

  DOM.loadingOverlay.classList.toggle(
    'show',
    visible
  );
}


/* ================================================================
   TOAST
   ================================================================ */

function showToast(
  message,
  type = 'info'
) {
  if (!DOM.toastContainer) {
    alert(message);
    return;
  }

  const toast =
    document.createElement('div');

  toast.className =
    'toast toast-' + type;

  const icon =
    document.createElement('span');

  icon.className =
    'toast-icon';

  icon.textContent =
    getToastIcon(type);

  const text =
    document.createElement('span');

  text.className =
    'toast-text';

  text.textContent =
    message;

  const close =
    document.createElement('button');

  close.type = 'button';
  close.className =
    'toast-close';

  close.textContent =
    '×';

  close.addEventListener(
    'click',
    function() {
      toast.remove();
    }
  );

  toast.appendChild(icon);
  toast.appendChild(text);
  toast.appendChild(close);

  DOM.toastContainer.appendChild(
    toast
  );

  requestAnimationFrame(
    function() {
      toast.classList.add(
        'show'
      );
    }
  );

  setTimeout(
    function() {
      toast.classList.remove(
        'show'
      );

      setTimeout(
        function() {
          toast.remove();
        },
        300
      );
    },
    4500
  );
}


function getToastIcon(type) {
  const icons = {
    success: '✓',
    error: '!',
    warning: '⚠',
    info: 'i'
  };

  return icons[type] ||
    icons.info;
}


/* ================================================================
   FORMATTING
   ================================================================ */

function formatScore(value) {
  const number =
    Number(value);

  if (isNaN(number)) {
    return '0';
  }

  return Number.isInteger(number)
    ? String(number)
    : number.toFixed(2);
}


function getScoreClass(value) {
  const score =
    Number(value) || 0;

  if (score >= 90) {
    return 'score-excellent';
  }

  if (score >= 80) {
    return 'score-good';
  }

  if (score >= 70) {
    return 'score-medium';
  }

  return 'score-low';
}


/* ================================================================
   HTML SECURITY
   ================================================================ */

function escapeHTML(value) {
  return String(
    value ?? ''
  )
    .replace(
      /&/g,
      '&amp;'
    )
    .replace(
      /</g,
      '&lt;'
    )
    .replace(
      />/g,
      '&gt;'
    )
    .replace(
      /"/g,
      '&quot;'
    )
    .replace(
      /'/g,
      '&#039;'
    );
}


/* ================================================================
   PUBLIC HELPERS
   ================================================================ */

window.UjianApp = {
  state: state,

  showView: showView,

  loadQuestions: loadQuestions,

  checkApi: checkApi,

  logoutAdmin: logoutAdmin
};
```
