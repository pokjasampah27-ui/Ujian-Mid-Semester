```javascript
/* ================================================================
   APLIKASI UJIAN ONLINE BAHASA INDONESIA
   FRONTEND — GITHUB PAGES
   ================================================================
   Backend:
   Google Apps Script Web App

   Database:
   Google Spreadsheet

   API:
   Code.gs yang disediakan
   ================================================================ */


/* ================================================================
   KONFIGURASI
   ================================================================ */

const CONFIG = {
  // ==============================================================
  // GANTI DENGAN URL WEB APP GOOGLE APPS SCRIPT
  // ==============================================================
  API_URL: 'https://script.google.com/macros/s/AKfycbyTxIIdNsMgcxCdsD19-LsiWMGUsaMNvzO8BJPPp0OPpcu8WJcOdl4LE0eZI50fxxl7yQ/exec',

  TOTAL_SOAL: 40,

  KELAS: [
    '12 M1',
    '12 M2',
    '12 M3',
    '12 M4',
    '12 M5'
  ],

  DURASI_UJIAN: 90,

  STORAGE_KEY: 'UJIAN_BAHASA_INDONESIA_STATE_V1',

  ADMIN_TOKEN_KEY: 'UJIAN_BAHASA_INDONESIA_ADMIN_TOKEN',

  SUBMISSION_KEY: 'UJIAN_BAHASA_INDONESIA_SUBMISSION_ID'
};


/* ================================================================
   STATE APLIKASI
   ================================================================ */

const state = {
  questions: [],
  answers: {},

  currentQuestion: 0,

  nama: '',
  kelas: '',
  tanggal: '',

  submissionId: '',

  examStarted: false,
  examSubmitted: false,

  remainingSeconds:
    CONFIG.DURASI_UJIAN * 60,

  timerInterval: null,

  classes: [],

  adminToken:
    sessionStorage.getItem(
      CONFIG.ADMIN_TOKEN_KEY
    ) || '',

  adminResults: [],

  currentAdminPage: 1,

  adminPageSize: 10
};


/* ================================================================
   DOM HELPER
   ================================================================ */

function $(selector) {
  return document.querySelector(selector);
}


function $$(selector) {
  return Array.from(
    document.querySelectorAll(selector)
  );
}


/* ================================================================
   INIT
   ================================================================ */

document.addEventListener(
  'DOMContentLoaded',
  function() {
    initApplication();
  }
);


async function initApplication() {
  try {
    setupEventListeners();

    setTodayDate();

    generateSubmissionId();

    restoreExamState();

    await loadClasses();

    if (
      state.examStarted &&
      !state.examSubmitted
    ) {
      await loadQuestions();

      renderExam();

      startTimer();

      showPage('examPage');

      return;
    }

    showPage('startPage');

  } catch (error) {
    console.error(error);

    showError(
      'Gagal memuat aplikasi. ' +
      getErrorMessage(error)
    );
  }
}


/* ================================================================
   EVENT LISTENERS
   ================================================================ */

function setupEventListeners() {

  /* --------------------------------------------------------------
     SISWA
     -------------------------------------------------------------- */

  bindClick(
    '#btnStartExam',
    startExam
  );

  bindClick(
    '#btnPrevious',
    previousQuestion
  );

  bindClick(
    '#btnNext',
    nextQuestion
  );

  bindClick(
    '#btnSubmitExam',
    confirmSubmitExam
  );

  bindClick(
    '#btnBackToStart',
    resetAndBackToStart
  );

  bindClick(
    '#btnViewExamResult',
    function() {
      const id =
        state.lastResult &&
        state.lastResult.idUjian;

      if (id) {
        loadExamResult(id);
      }
    }
  );


  /* --------------------------------------------------------------
     NAVIGASI
     -------------------------------------------------------------- */

  bindClick(
    '#navStudent',
    function() {
      showPage('startPage');
    }
  );

  bindClick(
    '#navAdmin',
    function() {
      showPage('adminLoginPage');
    }
  );


  /* --------------------------------------------------------------
     ADMIN LOGIN
     -------------------------------------------------------------- */

  bindClick(
    '#btnAdminLogin',
    adminLogin
  );

  bindClick(
    '#btnAdminLogout',
    adminLogout
  );


  /* --------------------------------------------------------------
     ADMIN DASHBOARD
     -------------------------------------------------------------- */

  bindClick(
    '#btnLoadResults',
    loadAdminDashboard
  );

  bindClick(
    '#btnLoadStatistics',
    loadAdminStatistics
  );

  bindClick(
    '#btnLoadClassStatistics',
    loadClassStatistics
  );

  bindClick(
    '#btnSearchExamResult',
    searchExamResult
  );

  bindClick(
    '#btnAdminResetFilter',
    resetAdminFilters
  );


  /* --------------------------------------------------------------
     ENTER PADA INPUT ADMIN
     -------------------------------------------------------------- */

  const adminPin =
    $('#adminPin');

  if (adminPin) {
    adminPin.addEventListener(
      'keydown',
      function(event) {
        if (
          event.key === 'Enter'
        ) {
          adminLogin();
        }
      }
    );
  }


  /* --------------------------------------------------------------
     FILTER ADMIN
     -------------------------------------------------------------- */

  [
    '#filterKelas',
    '#filterTanggal',
    '#filterNama',
    '#filterNilaiMin',
    '#filterNilaiMax'
  ].forEach(function(selector) {

    const element =
      $(selector);

    if (!element) return;

    element.addEventListener(
      'change',
      function() {
        if (
          state.adminToken
        ) {
          loadAdminDashboard();
        }
      }
    );

    element.addEventListener(
      'keydown',
      function(event) {
        if (
          event.key === 'Enter'
        ) {
          loadAdminDashboard();
        }
      }
    );
  });


  /* --------------------------------------------------------------
     MODAL
     -------------------------------------------------------------- */

  bindClick(
    '#btnCloseModal',
    closeModal
  );

  bindClick(
    '#modalOverlay',
    function(event) {
      if (
        event.target ===
        $('#modalOverlay')
      ) {
        closeModal();
      }
    }
  );


  /* --------------------------------------------------------------
     ESC
     -------------------------------------------------------------- */

  document.addEventListener(
    'keydown',
    function(event) {
      if (
        event.key === 'Escape'
      ) {
        closeModal();
      }
    }
  );


  /* --------------------------------------------------------------
     BEFORE UNLOAD
     -------------------------------------------------------------- */

  window.addEventListener(
    'beforeunload',
    function(event) {

      if (
        state.examStarted &&
        !state.examSubmitted
      ) {
        saveExamState();

        event.preventDefault();

        event.returnValue =
          'Ujian masih berlangsung.';
      }
    }
  );
}


/* ================================================================
   BIND CLICK AMAN
   ================================================================ */

function bindClick(
  selector,
  handler
) {
  const element =
    $(selector);

  if (!element) return;

  element.addEventListener(
    'click',
    handler
  );
}


/* ================================================================
   API
   ================================================================ */

async function apiGet(
  action,
  params = {}
) {

  if (
    !CONFIG.API_URL ||
    CONFIG.API_URL.indexOf(
      'GANTI_DENGAN'
    ) !== -1
  ) {
    throw new Error(
      'API_URL belum diatur pada script.js.'
    );
  }

  const query =
    new URLSearchParams();

  query.set(
    'action',
    action
  );

  Object.keys(params)
    .forEach(function(key) {

      const value =
        params[key];

      if (
        value === undefined ||
        value === null ||
        value === ''
      ) {
        return;
      }

      query.set(
        key,
        String(value)
      );
    });

  const url =
    CONFIG.API_URL +
    '?' +
    query.toString();

  const response =
    await fetch(
      url,
      {
        method: 'GET',
        redirect: 'follow'
      }
    );

  if (!response.ok) {
    throw new Error(
      'HTTP ' +
      response.status
    );
  }

  const data =
    await response.json();

  if (
    data &&
    data.success === false &&
    !data.unauthorized
  ) {
    throw new Error(
      data.error ||
      'Permintaan gagal.'
    );
  }

  return data;
}


async function apiPost(
  action,
  payload = {}
) {

  if (
    !CONFIG.API_URL ||
    CONFIG.API_URL.indexOf(
      'GANTI_DENGAN'
    ) !== -1
  ) {
    throw new Error(
      'API_URL belum diatur pada script.js.'
    );
  }

  const body = {
    action: action,
    ...payload
  };

  const response =
    await fetch(
      CONFIG.API_URL,
      {
        method: 'POST',

        headers: {
          'Content-Type':
            'text/plain;charset=utf-8'
        },

        body:
          JSON.stringify(body),

        redirect: 'follow'
      }
    );

  if (!response.ok) {
    throw new Error(
      'HTTP ' +
      response.status
    );
  }

  const data =
    await response.json();

  return data;
}


/* ================================================================
   PING SERVER
   ================================================================ */

async function pingServer() {
  return apiGet(
    'ping'
  );
}


/* ================================================================
   LOAD KELAS
   ================================================================ */

async function loadClasses() {

  try {

    const data =
      await apiGet(
        'getClasses'
      );

    if (
      data &&
      data.success &&
      Array.isArray(
        data.classes
      )
    ) {
      state.classes =
        data.classes;
    } else {
      state.classes =
        CONFIG.KELAS.slice();
    }

  } catch (error) {

    console.warn(
      'Gagal mengambil kelas dari server:',
      error
    );

    state.classes =
      CONFIG.KELAS.slice();
  }

  populateClassSelects();
}


/* ================================================================
   POPULATE CLASS SELECT
   ================================================================ */

function populateClassSelects() {

  const studentSelect =
    $('#kelas');

  if (studentSelect) {

    studentSelect.innerHTML =
      '<option value="">Pilih kelas</option>';

    state.classes.forEach(
      function(kelas) {

        const option =
          document.createElement(
            'option'
          );

        option.value =
          kelas;

        option.textContent =
          kelas;

        studentSelect.appendChild(
          option
        );
      }
    );
  }


  const filterSelect =
    $('#filterKelas');

  if (filterSelect) {

    filterSelect.innerHTML =
      '<option value="">Semua Kelas</option>';

    state.classes.forEach(
      function(kelas) {

        const option =
          document.createElement(
            'option'
          );

        option.value =
          kelas;

        option.textContent =
          kelas;

        filterSelect.appendChild(
          option
        );
      }
    );
  }
}


/* ================================================================
   LOAD QUESTIONS
   ================================================================ */

async function loadQuestions() {

  showLoading(
    'Memuat soal ujian...'
  );

  try {

    const data =
      await apiGet(
        'getQuestions'
      );

    if (
      !data ||
      !data.success
    ) {
      throw new Error(
        data &&
        data.error
          ? data.error
          : 'Soal gagal dimuat.'
      );
    }

    if (
      !Array.isArray(
        data.questions
      )
    ) {
      throw new Error(
        'Format data soal tidak valid.'
      );
    }

    if (
      data.questions.length !==
      CONFIG.TOTAL_SOAL
    ) {
      throw new Error(
        'Jumlah soal dari server adalah ' +
        data.questions.length +
        ', seharusnya ' +
        CONFIG.TOTAL_SOAL +
        '.'
      );
    }

    state.questions =
      data.questions;

    return state.questions;

  } finally {

    hideLoading();
  }
}


/* ================================================================
   MULAI UJIAN
   ================================================================ */

async function startExam() {

  clearMessages();

  const namaInput =
    $('#nama');

  const kelasInput =
    $('#kelas');

  const nama =
    namaInput
      ? namaInput.value.trim()
      : '';

  const kelas =
    kelasInput
      ? kelasInput.value.trim()
      : '';

  if (!nama) {

    showError(
      'Nama lengkap wajib diisi.'
    );

    if (namaInput) {
      namaInput.focus();
    }

    return;
  }

  if (!kelas) {

    showError(
      'Silakan pilih kelas.'
    );

    if (kelasInput) {
      kelasInput.focus();
    }

    return;
  }


  state.nama =
    nama;

  state.kelas =
    kelas;

  state.tanggal =
    getTodayIndonesianDate();

  state.currentQuestion =
    0;

  state.answers =
    {};

  state.remainingSeconds =
    CONFIG.DURASI_UJIAN * 60;

  state.examStarted =
    true;

  state.examSubmitted =
    false;

  generateSubmissionId();

  saveExamState();


  try {

    await loadQuestions();

    renderExam();

    showPage(
      'examPage'
    );

    startTimer();

  } catch (error) {

    state.examStarted =
      false;

    saveExamState();

    showError(
      getErrorMessage(error)
    );
  }
}


/* ================================================================
   RENDER EXAM
   ================================================================ */

function renderExam() {

  const total =
    state.questions.length;

  const question =
    state.questions[
      state.currentQuestion
    ];

  if (!question) {
    return;
  }


  /* --------------------------------------------------------------
     DATA SISWA
     -------------------------------------------------------------- */

  setText(
    '#examStudentName',
    state.nama
  );

  setText(
    '#examStudentClass',
    state.kelas
  );

  setText(
    '#examDate',
    state.tanggal
  );


  /* --------------------------------------------------------------
     NOMOR SOAL
     -------------------------------------------------------------- */

  setText(
    '#questionNumber',
    question.no
  );

  setText(
    '#questionTotal',
    total
  );


  /* --------------------------------------------------------------
     BENTUK
     -------------------------------------------------------------- */

  setText(
    '#questionType',
    getQuestionTypeLabel(
      question.bentuk
    )
  );


  /* --------------------------------------------------------------
     PROGRESS
     -------------------------------------------------------------- */

  const progress =
    ((state.currentQuestion + 1) /
      total) *
    100;

  const progressBar =
    $('#questionProgress');

  if (progressBar) {
    progressBar.style.width =
      progress + '%';
  }

  setText(
    '#progressPercent',
    Math.round(progress) +
      '%'
  );


  /* --------------------------------------------------------------
     STIMULUS
     -------------------------------------------------------------- */

  const stimulus =
    $('#questionStimulus');

  if (stimulus) {

    if (
      question.stimulus &&
      question.stimulus.trim()
    ) {

      stimulus.innerHTML =
        formatText(
          question.stimulus
        );

      stimulus.style.display =
        '';

    } else {

      stimulus.innerHTML =
        '';

      stimulus.style.display =
        'none';
    }
  }


  /* --------------------------------------------------------------
     PERTANYAAN
     -------------------------------------------------------------- */

  const questionText =
    $('#questionText');

  if (questionText) {

    questionText.innerHTML =
      formatText(
        question.pertanyaan
      );
  }


  /* --------------------------------------------------------------
     OPTIONS
     -------------------------------------------------------------- */

  renderOptions(
    question
  );


  /* --------------------------------------------------------------
     NAVIGATION
     -------------------------------------------------------------- */

  updateNavigationButtons();

  renderQuestionPalette();

  updateAnsweredCounter();

  saveExamState();
}


/* ================================================================
   RENDER OPTIONS
   ================================================================ */

function renderOptions(
  question
) {

  const container =
    $('#answerOptions');

  if (!container) {
    return;
  }

  container.innerHTML =
    '';


  const type =
    normalizeQuestionType(
      question.bentuk
    );


  if (type === 'PG') {

    renderPGOptions(
      container,
      question
    );

    return;
  }


  if (type === 'PGK') {

    renderPGKOptions(
      container,
      question
    );

    return;
  }


  if (type === 'B/S') {

    renderBSOptions(
      container,
      question
    );

    return;
  }


  container.innerHTML =
    '<div class="answer-error">' +
    'Jenis soal tidak dikenali.' +
    '</div>';
}


/* ================================================================
   RENDER PG
   ================================================================ */

function renderPGOptions(
  container,
  question
) {

  const letters =
    ['A', 'B', 'C', 'D'];

  const current =
    state.answers[
      String(question.no)
    ] || '';


  letters.forEach(
    function(letter) {

      const label =
        document.createElement(
          'label'
        );

      label.className =
        'answer-option';


      const input =
        document.createElement(
          'input'
        );

      input.type =
        'radio';

      input.name =
        'question_' +
        question.no;

      input.value =
        letter;

      input.checked =
        current === letter;


      const letterBox =
        document.createElement(
          'span'
        );

      letterBox.className =
        'option-letter';

      letterBox.textContent =
        letter;


      const text =
        document.createElement(
          'span'
        );

      text.className =
        'option-text';

      text.innerHTML =
        formatText(
          question.pilihan[
            letter
          ] || ''
        );


      label.appendChild(
        input
      );

      label.appendChild(
        letterBox
      );

      label.appendChild(
        text
      );


      input.addEventListener(
        'change',
        function() {

          state.answers[
            String(question.no)
          ] =
            letter;

          saveExamState();

          updateAnsweredCounter();

          renderQuestionPalette();
        }
      );


      container.appendChild(
        label
      );
    }
  );
}


/* ================================================================
   RENDER PGK
   ================================================================ */

function renderPGKOptions(
  container,
  question
) {

  const letters =
    ['A', 'B', 'C', 'D'];

  let current =
    state.answers[
      String(question.no)
    ] || [];

  if (!Array.isArray(current)) {

    current =
      String(current)
        .split('')
        .filter(function(value) {
          return letters.includes(
            value
          );
        });
  }


  const instruction =
    document.createElement(
      'div'
    );

  instruction.className =
    'question-instruction';

  instruction.innerHTML =
    '<strong>Pilihan Ganda Kompleks</strong>' +
    '<span>Pilih semua jawaban yang dianggap benar.</span>';

  container.appendChild(
    instruction
  );


  letters.forEach(
    function(letter) {

      const label =
        document.createElement(
          'label'
        );

      label.className =
        'answer-option';


      const input =
        document.createElement(
          'input'
        );

      input.type =
        'checkbox';

      input.name =
        'question_' +
        question.no;

      input.value =
        letter;

      input.checked =
        current.includes(
          letter
        );


      const letterBox =
        document.createElement(
          'span'
        );

      letterBox.className =
        'option-letter';

      letterBox.textContent =
        letter;


      const text =
        document.createElement(
          'span'
        );

      text.className =
        'option-text';

      text.innerHTML =
        formatText(
          question.pilihan[
            letter
          ] || ''
        );


      label.appendChild(
        input
      );

      label.appendChild(
        letterBox
      );

      label.appendChild(
        text
      );


      input.addEventListener(
        'change',
        function() {

          let selected =
            state.answers[
              String(question.no)
            ];

          if (
            !Array.isArray(
              selected
            )
          ) {
            selected = [];
          }

          if (
            input.checked
          ) {

            if (
              !selected.includes(
                letter
              )
            ) {
              selected.push(
                letter
              );
            }

          } else {

            selected =
              selected.filter(
                function(item) {
                  return item !==
                    letter;
                }
              );
          }

          selected.sort();

          state.answers[
            String(question.no)
          ] =
            selected;

          saveExamState();

          updateAnsweredCounter();

          renderQuestionPalette();
        }
      );


      container.appendChild(
        label
      );
    }
  );
}


/* ================================================================
   RENDER BENAR / SALAH
   ================================================================ */

function renderBSOptions(
  container,
  question
) {

  const current =
    state.answers[
      String(question.no)
    ] || '';


  const instruction =
    document.createElement(
      'div'
    );

  instruction.className =
    'question-instruction';

  instruction.innerHTML =
    '<strong>Benar / Salah</strong>' +
    '<span>Pilih salah satu jawaban.</span>';

  container.appendChild(
    instruction
  );


  const options = [
    {
      value: 'BENAR',
      label: 'Benar'
    },
    {
      value: 'SALAH',
      label: 'Salah'
    }
  ];


  options.forEach(
    function(option) {

      const label =
        document.createElement(
          'label'
        );

      label.className =
        'answer-option';


      const input =
        document.createElement(
          'input'
        );

      input.type =
        'radio';

      input.name =
        'question_' +
        question.no;

      input.value =
        option.value;

      input.checked =
        current ===
        option.value;


      const icon =
        document.createElement(
          'span'
        );

      icon.className =
        'option-icon';

      icon.textContent =
        option.value ===
        'BENAR'
          ? '✓'
          : '✕';


      const text =
        document.createElement(
          'span'
        );

      text.className =
        'option-text';

      text.textContent =
        option.label;


      label.appendChild(
        input
      );

      label.appendChild(
        icon
      );

      label.appendChild(
        text
      );


      input.addEventListener(
        'change',
        function() {

          state.answers[
            String(question.no)
          ] =
            option.value;

          saveExamState();

          updateAnsweredCounter();

          renderQuestionPalette();
        }
      );


      container.appendChild(
        label
      );
    }
  );
}


/* ================================================================
   NAVIGASI SOAL
   ================================================================ */

function nextQuestion() {

  if (
    state.currentQuestion >=
    state.questions.length - 1
  ) {

    showSubmitConfirmation();

    return;
  }

  state.currentQuestion++;

  renderExam();

  scrollExamToTop();
}


function previousQuestion() {

  if (
    state.currentQuestion <= 0
  ) {
    return;
  }

  state.currentQuestion--;

  renderExam();

  scrollExamToTop();
}


/* ================================================================
   PALETTE SOAL
   ================================================================ */

function renderQuestionPalette() {

  const container =
    $('#questionPalette');

  if (!container) {
    return;
  }

  container.innerHTML =
    '';


  state.questions.forEach(
    function(question, index) {

      const button =
        document.createElement(
          'button'
        );

      button.type =
        'button';

      button.className =
        'question-number';

      button.textContent =
        question.no;


      if (
        index ===
        state.currentQuestion
      ) {
        button.classList.add(
          'active'
        );
      }


      if (
        isQuestionAnswered(
          question
        )
      ) {
        button.classList.add(
          'answered'
        );
      }


      button.addEventListener(
        'click',
        function() {

          state.currentQuestion =
            index;

          renderExam();

          scrollExamToTop();
        }
      );


      container.appendChild(
        button
      );
    }
  );
}


/* ================================================================
   ANSWER STATUS
   ================================================================ */

function isQuestionAnswered(
  question
) {

  const answer =
    state.answers[
      String(question.no)
    ];


  if (
    answer === undefined ||
    answer === null
  ) {
    return false;
  }


  if (
    Array.isArray(answer)
  ) {
    return answer.length > 0;
  }


  return String(
    answer
  ).trim() !== '';
}


function getAnsweredCount() {

  return state.questions
    .filter(
      isQuestionAnswered
    )
    .length;
}


function updateAnsweredCounter() {

  const answered =
    getAnsweredCount();

  setText(
    '#answeredCount',
    answered
  );

  setText(
    '#unansweredCount',
    state.questions.length -
      answered
  );
}


/* ================================================================
   NAVIGATION BUTTON
   ================================================================ */

function updateNavigationButtons() {

  const previous =
    $('#btnPrevious');

  const next =
    $('#btnNext');

  const submit =
    $('#btnSubmitExam');


  if (previous) {

    previous.disabled =
      state.currentQuestion <= 0;
  }


  const last =
    state.currentQuestion >=
    state.questions.length - 1;


  if (next) {

    next.style.display =
      last
        ? 'none'
        : '';
  }


  if (submit) {

    submit.style.display =
      last
        ? ''
        : 'none';
  }
}


/* ================================================================
   TIMER
   ================================================================ */

function startTimer() {

  stopTimer();

  updateTimerDisplay();


  state.timerInterval =
    setInterval(
      function() {

        if (
          state.remainingSeconds <=
          0
        ) {

          stopTimer();

          autoSubmitExam();

          return;
        }


        state.remainingSeconds--;

        updateTimerDisplay();

        saveExamState();

      },
      1000
    );
}


function stopTimer() {

  if (
    state.timerInterval
  ) {

    clearInterval(
      state.timerInterval
    );

    state.timerInterval =
      null;
  }
}


function updateTimerDisplay() {

  const total =
    Math.max(
      0,
      state.remainingSeconds
    );


  const minutes =
    Math.floor(
      total / 60
    );

  const seconds =
    total % 60;


  const text =
    String(minutes).padStart(
      2,
      '0'
    ) +
    ':' +
    String(seconds).padStart(
      2,
      '0'
    );


  setText(
    '#examTimer',
    text
  );


  const timer =
    $('#examTimer');

  if (!timer) {
    return;
  }


  timer.classList.toggle(
    'warning',
    total <= 300
  );

  timer.classList.toggle(
    'danger',
    total <= 60
  );
}


/* ================================================================
   SUBMIT CONFIRMATION
   ================================================================ */

function confirmSubmitExam() {

  showSubmitConfirmation();
}


function showSubmitConfirmation() {

  const answered =
    getAnsweredCount();

  const total =
    state.questions.length;

  const unanswered =
    total - answered;


  let message =
    'Kamu sudah menjawab ' +
    answered +
    ' dari ' +
    total +
    ' soal.';


  if (
    unanswered > 0
  ) {

    message +=
      '<br><br>' +
      '<strong>' +
      unanswered +
      ' soal belum dijawab.</strong>' +
      '<br>' +
      'Apakah kamu yakin ingin mengirim ujian?';

  } else {

    message +=
      '<br><br>' +
      'Semua soal sudah dijawab.' +
      '<br>' +
      'Yakin ingin mengirim ujian?';
  }


  showConfirmModal(
    'Kirim Ujian?',
    message,
    submitExam
  );
}


/* ================================================================
   AUTO SUBMIT
   ================================================================ */

function autoSubmitExam() {

  if (
    state.examSubmitted
  ) {
    return;
  }


  showAlertModal(
    'Waktu Habis',
    'Waktu ujian telah habis. Jawaban akan dikirim secara otomatis.',
    function() {
      submitExam();
    }
  );
}


/* ================================================================
   SUBMIT EXAM
   ================================================================ */

async function submitExam() {

  if (
    state.examSubmitted
  ) {
    return;
  }


  state.examSubmitted =
    true;

  stopTimer();

  saveExamState();

  showLoading(
    'Mengirim jawaban ujian...'
  );


  try {

    const payload = {

      nama:
        state.nama,

      kelas:
        state.kelas,

      tanggal:
        state.tanggal,

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


    if (
      !data ||
      !data.success
    ) {

      throw new Error(
        data &&
        data.error
          ? data.error
          : 'Ujian gagal disimpan.'
      );
    }


    state.lastResult =
      data.result;


    state.examSubmitted =
      true;

    state.examStarted =
      false;


    stopTimer();

    clearSavedExamState();


    showResultPage(
      data.result,
      data.duplicate
    );


  } catch (error) {

    /*
     * Jika server gagal,
     * izinkan submit ulang.
     */
    state.examSubmitted =
      false;

    saveExamState();


    showError(
      'Ujian belum berhasil dikirim. ' +
      getErrorMessage(error)
    );

  } finally {

    hideLoading();
  }
}


/* ================================================================
   RESULT PAGE
   ================================================================ */

function showResultPage(
  result,
  duplicate
) {

  if (!result) {
    return;
  }


  setText(
    '#resultExamId',
    result.idUjian
  );

  setText(
    '#resultName',
    result.nama
  );

  setText(
    '#resultClass',
    result.kelas
  );

  setText(
    '#resultDate',
    result.tanggal
  );

  setText(
    '#resultTotal',
    result.totalSoal
  );

  setText(
    '#resultCorrect',
    result.benar
  );

  setText(
    '#resultWrong',
    result.salah
  );

  setText(
    '#resultScore',
    formatScore(
      result.nilai
    )
  );

  setText(
    '#resultStatus',
    result.status ||
      'SELESAI'
  );


  const score =
    Number(result.nilai) || 0;


  const scoreElement =
    $('#resultScore');

  if (scoreElement) {

    scoreElement.classList.remove(
      'excellent',
      'good',
      'fair',
      'low'
    );


    if (score >= 90) {

      scoreElement.classList.add(
        'excellent'
      );

    } else if (
      score >= 80
    ) {

      scoreElement.classList.add(
        'good'
      );

    } else if (
      score >= 70
    ) {

      scoreElement.classList.add(
        'fair'
      );

    } else {

      scoreElement.classList.add(
        'low'
      );
    }
  }


  showPage(
    'resultPage'
  );
}


/* ================================================================
   RESET UJIAN
   ================================================================ */

function resetAndBackToStart() {

  showConfirmModal(
    'Kembali?',
    'Data ujian yang sedang tersimpan di perangkat akan dihapus.',
    function() {

      stopTimer();

      state.questions =
        [];

      state.answers =
        {};

      state.currentQuestion =
        0;

      state.nama =
        '';

      state.kelas =
        '';

      state.examStarted =
        false;

      state.examSubmitted =
        false;

      state.remainingSeconds =
        CONFIG.DURASI_UJIAN * 60;

      clearSavedExamState();

      generateSubmissionId();

      const name =
        $('#nama');

      const kelas =
        $('#kelas');

      if (name) {
        name.value = '';
      }

      if (kelas) {
        kelas.value = '';
      }

      showPage(
        'startPage'
      );
    }
  );
}


/* ================================================================
   LOCAL STORAGE
   ================================================================ */

function saveExamState() {

  if (
    !state.examStarted
  ) {
    return;
  }


  const data = {

    nama:
      state.nama,

    kelas:
      state.kelas,

    tanggal:
      state.tanggal,

    submissionId:
      state.submissionId,

    answers:
      state.answers,

    currentQuestion:
      state.currentQuestion,

    remainingSeconds:
      state.remainingSeconds,

    examStarted:
      state.examStarted
  };


  try {

    localStorage.setItem(
      CONFIG.STORAGE_KEY,
      JSON.stringify(data)
    );

  } catch (error) {

    console.warn(
      'Gagal menyimpan state ujian:',
      error
    );
  }
}


function restoreExamState() {

  try {

    const raw =
      localStorage.getItem(
        CONFIG.STORAGE_KEY
      );

    if (!raw) {
      return false;
    }


    const data =
      JSON.parse(raw);


    if (
      !data ||
      !data.examStarted
    ) {
      return false;
    }


    state.nama =
      data.nama || '';

    state.kelas =
      data.kelas || '';

    state.tanggal =
      data.tanggal || '';

    state.submissionId =
      data.submissionId || '';

    state.answers =
      data.answers || {};

    state.currentQuestion =
      Number(
        data.currentQuestion
      ) || 0;

    state.remainingSeconds =
      Number(
        data.remainingSeconds
      ) ||
      CONFIG.DURASI_UJIAN * 60;

    state.examStarted =
      true;


    if (
      !state.submissionId
    ) {
      generateSubmissionId();
    }


    return true;

  } catch (error) {

    console.warn(
      'State ujian rusak:',
      error
    );

    clearSavedExamState();

    return false;
  }
}


function clearSavedExamState() {

  try {

    localStorage.removeItem(
      CONFIG.STORAGE_KEY
    );

  } catch (error) {
    console.warn(error);
  }
}


/* ================================================================
   SUBMISSION ID
   ================================================================ */

function generateSubmissionId() {

  let existing = '';

  try {

    existing =
      localStorage.getItem(
        CONFIG.SUBMISSION_KEY
      ) || '';

  } catch (error) {
    console.warn(error);
  }


  if (existing) {

    state.submissionId =
      existing;

    return;
  }


  const random =
    Math.random()
      .toString(36)
      .substring(2, 10);


  const timestamp =
    Date.now()
      .toString(36);


  const id =
    'SUB-' +
    timestamp +
    '-' +
    random;


  state.submissionId =
    id;


  try {

    localStorage.setItem(
      CONFIG.SUBMISSION_KEY,
      id
    );

  } catch (error) {
    console.warn(error);
  }
}


/* ================================================================
   ADMIN LOGIN
   ================================================================ */

async function adminLogin() {

  const pinInput =
    $('#adminPin');

  const pin =
    pinInput
      ? pinInput.value.trim()
      : '';


  if (!pin) {

    showError(
      'PIN Admin wajib diisi.'
    );

    if (pinInput) {
      pinInput.focus();
    }

    return;
  }


  showLoading(
    'Memverifikasi PIN Admin...'
  );


  try {

    const data =
      await apiPost(
        'adminAuth',
        {
          pin: pin
        }
      );


    if (
      !data ||
      !data.success
    ) {

      throw new Error(
        data &&
        data.error
          ? data.error
          : 'Login Admin gagal.'
      );
    }


    state.adminToken =
      data.token;


    sessionStorage.setItem(
      CONFIG.ADMIN_TOKEN_KEY,
      data.token
    );


    if (pinInput) {
      pinInput.value = '';
    }


    showPage(
      'adminPage'
    );


    await loadAdminDashboard();

    await loadAdminStatistics();

    await loadClassStatistics();


  } catch (error) {

    showError(
      getErrorMessage(error)
    );

  } finally {

    hideLoading();
  }
}


/* ================================================================
   ADMIN LOGOUT
   ================================================================ */

function adminLogout() {

  state.adminToken =
    '';

  state.adminResults =
    [];

  sessionStorage.removeItem(
    CONFIG.ADMIN_TOKEN_KEY
  );

  showPage(
    'adminLoginPage'
  );
}


/* ================================================================
   ADMIN DASHBOARD
   ================================================================ */

async function loadAdminDashboard() {

  if (
    !state.adminToken
  ) {

    showPage(
      'adminLoginPage'
    );

    return;
  }


  const params = {

    token:
      state.adminToken,

    kelas:
      getValue(
        '#filterKelas'
      ),

    tanggal:
      getValue(
        '#filterTanggal'
      ),

    nama:
      getValue(
        '#filterNama'
      ),

    nilaiMin:
      getValue(
        '#filterNilaiMin'
      ),

    nilaiMax:
      getValue(
        '#filterNilaiMax'
      )
  };


  showAdminTableLoading();


  try {

    const data =
      await apiGet(
        'getAdminResults',
        params
      );


    if (
      data &&
      data.unauthorized
    ) {

      adminLogout();

      showError(
        'Sesi Admin telah berakhir. Silakan login kembali.'
      );

      return;
    }


    if (
      !data ||
      !data.success
    ) {

      throw new Error(
        data &&
        data.error
          ? data.error
          : 'Data hasil gagal dimuat.'
      );
    }


    state.adminResults =
      Array.isArray(
        data.results
      )
        ? data.results
        : [];


    state.currentAdminPage =
      1;


    renderAdminResults();

    updateAdminResultCount();


  } catch (error) {

    showError(
      getErrorMessage(error)
    );

  } finally {

    hideAdminTableLoading();
  }
}


/* ================================================================
   RENDER ADMIN RESULTS
   ================================================================ */

function renderAdminResults() {

  const tbody =
    $('#adminResultsBody');

  if (!tbody) {
    return;
  }


  tbody.innerHTML =
    '';


  if (
    state.adminResults.length === 0
  ) {

    tbody.innerHTML =
      '<tr>' +
      '<td colspan="10" class="empty-state">' +
      'Belum ada hasil ujian.' +
      '</td>' +
      '</tr>';

    renderAdminPagination();

    return;
  }


  const start =
    (
      state.currentAdminPage - 1
    ) *
    state.adminPageSize;


  const end =
    start +
    state.adminPageSize;


  const pageItems =
    state.adminResults.slice(
      start,
      end
    );


  pageItems.forEach(
    function(item, index) {

      const tr =
        document.createElement(
          'tr'
        );


      tr.innerHTML =
        '<td>' +
        escapeHtml(
          item.idUjian
        ) +
        '</td>' +

        '<td>' +
        escapeHtml(
          item.nama
        ) +
        '</td>' +

        '<td>' +
        escapeHtml(
          item.kelas
        ) +
        '</td>' +

        '<td>' +
        escapeHtml(
          item.tanggal
        ) +
        '</td>' +

        '<td>' +
        escapeHtml(
          item.totalSoal
        ) +
        '</td>' +

        '<td class="correct-cell">' +
        escapeHtml(
          item.benar
        ) +
        '</td>' +

        '<td class="wrong-cell">' +
        escapeHtml(
          item.salah
        ) +
        '</td>' +

        '<td>' +
        '<strong class="' +
        getScoreClass(
          item.nilai
        ) +
        '">' +
        escapeHtml(
          formatScore(
            item.nilai
          )
        ) +
        '</strong>' +
        '</td>' +

        '<td>' +
        escapeHtml(
          item.status
        ) +
        '</td>';


      tbody.appendChild(
        tr
      );
    }
  );


  renderAdminPagination();
}


/* ================================================================
   ADMIN PAGINATION
   ================================================================ */

function renderAdminPagination() {

  const container =
    $('#adminPagination');

  if (!container) {
    return;
  }


  container.innerHTML =
    '';


  const totalPages =
    Math.ceil(
      state.adminResults.length /
      state.adminPageSize
    );


  if (
    totalPages <= 1
  ) {
    return;
  }


  const previous =
    document.createElement(
      'button'
    );

  previous.type =
    'button';

  previous.className =
    'pagination-button';

  previous.textContent =
    '‹';

  previous.disabled =
    state.currentAdminPage <= 1;

  previous.addEventListener(
    'click',
    function() {

      if (
        state.currentAdminPage > 1
      ) {

        state.currentAdminPage--;

        renderAdminResults();
      }
    }
  );


  container.appendChild(
    previous
  );


  for (
    let page = 1;
    page <= totalPages;
    page++
  ) {

    const button =
      document.createElement(
        'button'
      );

    button.type =
      'button';

    button.className =
      'pagination-button';

    button.textContent =
      page;


    if (
      page ===
      state.currentAdminPage
    ) {

      button.classList.add(
        'active'
      );
    }


    button.addEventListener(
      'click',
      function() {

        state.currentAdminPage =
          page;

        renderAdminResults();
      }
    );


    container.appendChild(
      button
    );
  }


  const next =
    document.createElement(
      'button'
    );

  next.type =
    'button';

  next.className =
    'pagination-button';

  next.textContent =
    '›';

  next.disabled =
    state.currentAdminPage >=
    totalPages;


  next.addEventListener(
    'click',
    function() {

      if (
        state.currentAdminPage <
        totalPages
      ) {

        state.currentAdminPage++;

        renderAdminResults();
      }
    }
  );


  container.appendChild(
    next
  );
}


/* ================================================================
   ADMIN COUNT
   ================================================================ */

function updateAdminResultCount() {

  setText(
    '#adminResultCount',
    state.adminResults.length
  );
}


/* ================================================================
   ADMIN STATISTICS
   ================================================================ */

async function loadAdminStatistics() {

  if (
    !state.adminToken
  ) {
    return;
  }


  const params = {

    token:
      state.adminToken,

    kelas:
      getValue(
        '#filterKelas'
      ),

    tanggal:
      getValue(
        '#filterTanggal'
      ),

    nama:
      getValue(
        '#filterNama'
      ),

    nilaiMin:
      getValue(
        '#filterNilaiMin'
      ),

    nilaiMax:
      getValue(
        '#filterNilaiMax'
      )
  };


  try {

    const data =
      await apiGet(
        'getStatistics',
        params
      );


    if (
      data &&
      data.unauthorized
    ) {

      adminLogout();

      return;
    }


    if (
      !data ||
      !data.success
    ) {
      return;
    }


    renderStatistics(
      data.statistics
    );


  } catch (error) {

    console.warn(
      'Gagal memuat statistik:',
      error
    );
  }
}


/* ================================================================
   RENDER STATISTICS
   ================================================================ */

function renderStatistics(
  stats
) {

  if (!stats) {
    return;
  }


  setText(
    '#statTotalPeserta',
    stats.totalPeserta || 0
  );

  setText(
    '#statRataRata',
    formatScore(
      stats.rataRata || 0
    )
  );

  setText(
    '#statTertinggi',
    formatScore(
      stats.nilaiTertinggi || 0
    )
  );

  setText(
    '#statTerendah',
    formatScore(
      stats.nilaiTerendah || 0
    )
  );


  if (
    stats.kelas
  ) {

    Object.keys(
      stats.kelas
    ).forEach(
      function(kelas) {

        const safe =
          kelas
            .replace(
              /\s+/g,
              '_'
            )
            .replace(
              /[^A-Za-z0-9_]/g,
              ''
            );

        setText(
          '#classCount_' +
          safe,
          stats.kelas[
            kelas
          ]
        );
      }
    );
  }
}


/* ================================================================
   CLASS STATISTICS
   ================================================================ */

async function loadClassStatistics() {

  if (
    !state.adminToken
  ) {
    return;
  }


  const tanggal =
    getValue(
      '#filterTanggal'
    );


  try {

    const data =
      await apiGet(
        'getClassStatistics',
        {
          token:
            state.adminToken,

          tanggal:
            tanggal
        }
      );


    if (
      data &&
      data.unauthorized
    ) {

      adminLogout();

      return;
    }


    if (
      !data ||
      !data.success
    ) {
      return;
    }


    renderClassStatistics(
      data.statistics
    );


  } catch (error) {

    console.warn(
      'Gagal memuat statistik kelas:',
      error
    );
  }
}


/* ================================================================
   RENDER CLASS STATISTICS
   ================================================================ */

function renderClassStatistics(
  rows
) {

  const tbody =
    $('#classStatisticsBody');

  if (!tbody) {
    return;
  }


  tbody.innerHTML =
    '';


  if (
    !Array.isArray(rows) ||
    rows.length === 0
  ) {

    tbody.innerHTML =
      '<tr>' +
      '<td colspan="5">' +
      'Belum ada data.' +
      '</td>' +
      '</tr>';

    return;
  }


  rows.forEach(
    function(row) {

      const tr =
        document.createElement(
          'tr'
        );


      tr.innerHTML =
        '<td>' +
        escapeHtml(
          row.kelas
        ) +
        '</td>' +

        '<td>' +
        escapeHtml(
          row.peserta
        ) +
        '</td>' +

        '<td>' +
        escapeHtml(
          formatScore(
            row.rataRata
          )
        ) +
        '</td>' +

        '<td>' +
        escapeHtml(
          formatScore(
            row.tertinggi
          )
        ) +
        '</td>' +

        '<td>' +
        escapeHtml(
          formatScore(
            row.terendah
          )
        ) +
        '</td>';


      tbody.appendChild(
        tr
      );
    }
  );
}


/* ================================================================
   SEARCH EXAM RESULT
   ================================================================ */

async function searchExamResult() {

  const input =
    $('#searchExamId');

  const id =
    input
      ? input.value.trim()
      : '';


  if (!id) {

    showError(
      'Masukkan ID ujian terlebih dahulu.'
    );

    return;
  }


  showLoading(
    'Mencari hasil ujian...'
  );


  try {

    const data =
      await apiGet(
        'getExamResult',
        {
          idUjian:
            id
        }
      );


    if (
      !data ||
      !data.success
    ) {

      throw new Error(
        data &&
        data.error
          ? data.error
          : 'Hasil ujian tidak ditemukan.'
      );
    }


    showResultPage(
      data.result,
      false
    );


  } catch (error) {

    showError(
      getErrorMessage(error)
    );

  } finally {

    hideLoading();
  }
}


/* ================================================================
   RESET ADMIN FILTER
   ================================================================ */

function resetAdminFilters() {

  [
    '#filterKelas',
    '#filterTanggal',
    '#filterNama',
    '#filterNilaiMin',
    '#filterNilaiMax'
  ].forEach(
    function(selector) {

      const element =
        $(selector);

      if (!element) {
        return;
      }

      element.value =
        '';
    }
  );


  loadAdminDashboard();

  loadAdminStatistics();

  loadClassStatistics();
}


/* ================================================================
   GET EXAM RESULT
   ================================================================ */

async function loadExamResult(
  examId
) {

  if (!examId) {
    return;
  }


  showLoading(
    'Memuat hasil ujian...'
  );


  try {

    const data =
      await apiGet(
        'getExamResult',
        {
          idUjian:
            examId
        }
      );


    if (
      !data ||
      !data.success
    ) {

      throw new Error(
        data &&
        data.error
          ? data.error
          : 'Hasil ujian tidak ditemukan.'
      );
    }


    showResultPage(
      data.result,
      false
    );


  } catch (error) {

    showError(
      getErrorMessage(error)
    );

  } finally {

    hideLoading();
  }
}


/* ================================================================
   PAGE NAVIGATION
   ================================================================ */

function showPage(
  pageId
) {

  $$('.app-page')
    .forEach(
      function(page) {

        page.classList.remove(
          'active'
        );

        page.style.display =
          'none';
      }
    );


  const page =
    $('#' + pageId);

  if (!page) {
    return;
  }


  page.classList.add(
    'active'
  );

  page.style.display =
    'block';


  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });


  clearMessages();
}


/* ================================================================
   MODAL
   ================================================================ */

function showConfirmModal(
  title,
  message,
  callback
) {

  const overlay =
    $('#modalOverlay');

  const titleElement =
    $('#modalTitle');

  const messageElement =
    $('#modalMessage');

  const confirmButton =
    $('#btnModalConfirm');


  if (
    !overlay ||
    !titleElement ||
    !messageElement ||
    !confirmButton
  ) {

    if (
      window.confirm(
        stripHtml(message)
      )
    ) {
      callback();
    }

    return;
  }


  titleElement.textContent =
    title;

  messageElement.innerHTML =
    message;


  confirmButton.onclick =
    function() {

      closeModal();

      callback();
    };


  overlay.classList.add(
    'show'
  );
}


function showAlertModal(
  title,
  message,
  callback
) {

  const overlay =
    $('#modalOverlay');

  const titleElement =
    $('#modalTitle');

  const messageElement =
    $('#modalMessage');

  const confirmButton =
    $('#btnModalConfirm');


  if (
    !overlay ||
    !titleElement ||
    !messageElement ||
    !confirmButton
  ) {

    alert(
      stripHtml(message)
    );

    if (callback) {
      callback();
    }

    return;
  }


  titleElement.textContent =
    title;

  messageElement.innerHTML =
    message;


  confirmButton.textContent =
    'OK';


  confirmButton.onclick =
    function() {

      closeModal();

      if (callback) {
        callback();
      }
    };


  overlay.classList.add(
    'show'
  );
}


function closeModal() {

  const overlay =
    $('#modalOverlay');

  if (!overlay) {
    return;
  }

  overlay.classList.remove(
    'show'
  );


  const confirmButton =
    $('#btnModalConfirm');

  if (confirmButton) {

    confirmButton.textContent =
      'Ya, Kirim';
  }
}


/* ================================================================
   LOADING
   ================================================================ */

function showLoading(
  message
) {

  const overlay =
    $('#loadingOverlay');

  const text =
    $('#loadingText');


  if (text) {

    text.textContent =
      message ||
      'Memuat...';
  }


  if (overlay) {

    overlay.classList.add(
      'show'
    );
  }
}


function hideLoading() {

  const overlay =
    $('#loadingOverlay');

  if (overlay) {

    overlay.classList.remove(
      'show'
    );
  }
}


/* ================================================================
   ADMIN TABLE LOADING
   ================================================================ */

function showAdminTableLoading() {

  const tbody =
    $('#adminResultsBody');

  if (!tbody) {
    return;
  }


  tbody.innerHTML =
    '<tr>' +
    '<td colspan="10" class="loading-cell">' +
    '⏳ Memuat data...' +
    '</td>' +
    '</tr>';
}


function hideAdminTableLoading() {
  /* Tidak diperlukan. */
}


/* ================================================================
   ERROR / MESSAGE
   ================================================================ */

function showError(
  message
) {

  const element =
    $('#errorMessage');

  if (!element) {

    alert(
      message
    );

    return;
  }


  element.textContent =
    message || 'Terjadi kesalahan.';


  element.classList.add(
    'show'
  );


  setTimeout(
    function() {

      element.classList.remove(
        'show'
      );

    },
    6000
  );
}


function clearMessages() {

  const element =
    $('#errorMessage');

  if (element) {

    element.textContent =
      '';

    element.classList.remove(
      'show'
    );
  }
}


/* ================================================================
   DATE
   ================================================================ */

function setTodayDate() {

  const input =
    $('#examDateInput');

  if (!input) {
    return;
  }


  const now =
    new Date();


  const year =
    now.getFullYear();


  const month =
    String(
      now.getMonth() + 1
    ).padStart(
      2,
      '0'
    );


  const day =
    String(
      now.getDate()
    ).padStart(
      2,
      '0'
    );


  input.value =
    year +
    '-' +
    month +
    '-' +
    day;
}


function getTodayIndonesianDate() {

  const now =
    new Date();


  const day =
    String(
      now.getDate()
    ).padStart(
      2,
      '0'
    );


  const month =
    String(
      now.getMonth() + 1
    ).padStart(
      2,
      '0'
    );


  const year =
    now.getFullYear();


  return (
    day +
    '-' +
    month +
    '-' +
    year
  );
}


/* ================================================================
   FORMAT QUESTION TYPE
   ================================================================ */

function normalizeQuestionType(
  value
) {

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
    text ===
      'PILIHAN GANDA KOMPLEKS'
  ) {
    return 'PGK';
  }


  if (
    text === 'B/S' ||
    text === 'BS' ||
    text ===
      'BENAR/SALAH' ||
    text ===
      'BENAR SALAH'
  ) {
    return 'B/S';
  }


  return text;
}


function getQuestionTypeLabel(
  type
) {

  const normalized =
    normalizeQuestionType(
      type
    );


  if (
    normalized === 'PG'
  ) {
    return 'PILIHAN GANDA';
  }


  if (
    normalized === 'PGK'
  ) {
    return 'PILIHAN GANDA KOMPLEKS';
  }


  if (
    normalized === 'B/S'
  ) {
    return 'BENAR / SALAH';
  }


  return normalized;
}


/* ================================================================
   FORMAT TEXT
   ================================================================ */

function formatText(
  text
) {

  if (
    text === null ||
    text === undefined
  ) {
    return '';
  }


  const value =
    String(text);


  /*
   * Escape HTML terlebih dahulu.
   */
  let safe =
    escapeHtml(value);


  /*
   * Baris baru.
   */
  safe =
    safe.replace(
      /\r?\n/g,
      '<br>'
    );


  return safe;
}


/* ================================================================
   ESCAPE HTML
   ================================================================ */

function escapeHtml(
  value
) {

  if (
    value === null ||
    value === undefined
  ) {
    return '';
  }


  return String(value)
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
   STRIP HTML
   ================================================================ */

function stripHtml(
  value
) {

  const element =
    document.createElement(
      'div'
    );

  element.innerHTML =
    value || '';

  return element.textContent ||
    element.innerText ||
    '';
}


/* ================================================================
   SCORE
   ================================================================ */

function formatScore(
  value
) {

  const number =
    Number(value);


  if (
    !Number.isFinite(
      number
    )
  ) {
    return '0';
  }


  return number
    .toFixed(2)
    .replace(
      /\.00$/,
      ''
    );
}


function getScoreClass(
  value
) {

  const score =
    Number(value) || 0;


  if (
    score >= 90
  ) {
    return 'score-excellent';
  }


  if (
    score >= 80
  ) {
    return 'score-good';
  }


  if (
    score >= 70
  ) {
    return 'score-fair';
  }


  return 'score-low';
}


/* ================================================================
   DOM TEXT
   ================================================================ */

function setText(
  selector,
  value
) {

  const element =
    $(selector);

  if (!element) {
    return;
  }


  element.textContent =
    value === undefined ||
    value === null
      ? ''
      : value;
}


/* ================================================================
   GET VALUE
   ================================================================ */

function getValue(
  selector
) {

  const element =
    $(selector);

  if (!element) {
    return '';
  }


  return String(
    element.value || ''
  ).trim();
}


/* ================================================================
   ERROR MESSAGE
   ================================================================ */

function getErrorMessage(
  error
) {

  if (!error) {
    return 'Terjadi kesalahan.';
  }


  if (
    error.message
  ) {
    return String(
      error.message
    );
  }


  return String(error);
}


/* ================================================================
   SCROLL
   ================================================================ */

function scrollExamToTop() {

  const examCard =
    $('#examQuestionCard');

  if (examCard) {

    examCard.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });

    return;
  }


  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}


/* ================================================================
   DEBUG HELPER
   ================================================================ */

window.UjianApp = {

  state: state,

  startExam:
    startExam,

  submitExam:
    submitExam,

  loadQuestions:
    loadQuestions,

  adminLogin:
    adminLogin,

  adminLogout:
    adminLogout,

  loadAdminDashboard:
    loadAdminDashboard,

  loadAdminStatistics:
    loadAdminStatistics,

  loadClassStatistics:
    loadClassStatistics,

  pingServer:
    pingServer

};
```
