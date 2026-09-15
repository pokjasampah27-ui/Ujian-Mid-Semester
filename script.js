```javascript
/* ================================================================
   UJIAN BAHASA INDONESIA
   FRONTEND JAVASCRIPT
   GitHub Pages + Google Apps Script Web App + Google Spreadsheet
   ================================================================ */

'use strict';

/* ================================================================
   KONFIGURASI
   ================================================================ */

const CONFIG = {
  // GANTI dengan URL Web App Google Apps Script milik Anda
  API_URL: 'GANTI_DENGAN_URL_WEB_APP_APPS_SCRIPT',

  TOTAL_SOAL: 40,

  KELAS: [
    '12 M1',
    '12 M2',
    '12 M3',
    '12 M4',
    '12 M5'
  ],

  STORAGE_KEY: 'ujian_bahasa_indonesia_state_v1',

  SUBMISSION_KEY: 'ujian_bahasa_indonesia_submission_v1',

  REQUEST_TIMEOUT: 30000
};


/* ================================================================
   STATE APLIKASI
   ================================================================ */

const state = {
  questions: [],
  currentQuestion: 0,

  studentName: '',
  studentClass: '',
  examDate: '',

  answers: {},

  started: false,
  submitted: false,
  submitting: false,

  submissionId: '',

  result: null
};


/* ================================================================
   DOM HELPER
   ================================================================ */

const $ = (selector) => document.querySelector(selector);

const $$ = (selector) => Array.from(document.querySelectorAll(selector));


/* ================================================================
   INISIALISASI
   ================================================================ */

document.addEventListener('DOMContentLoaded', init);


async function init() {
  try {
    bindEvents();

    populateClasses();

    setDefaultExamDate();

    loadSavedState();

    showScreen('loadingScreen');

    await loadQuestions();

    showScreen('startScreen');

    restoreIdentityForm();

  } catch (error) {
    console.error('INIT ERROR:', error);

    showAlert(
      'error',
      'Gagal Memuat',
      error.message || 'Aplikasi gagal dimuat. Silakan coba lagi.'
    );
  }
}


/* ================================================================
   EVENT BINDING
   ================================================================ */

function bindEvents() {

  /* Form identitas */
  const identityForm = $('#identityForm');

  if (identityForm) {
    identityForm.addEventListener('submit', handleStartExam);
  }


  /* Tombol mulai */
  const startButton = $('#startExamButton');

  if (startButton) {
    startButton.addEventListener('click', handleStartExam);
  }


  /* Navigasi soal */
  const prevButton = $('#prevQuestionButton');

  if (prevButton) {
    prevButton.addEventListener('click', () => {
      goToQuestion(state.currentQuestion - 1);
    });
  }


  const nextButton = $('#nextQuestionButton');

  if (nextButton) {
    nextButton.addEventListener('click', () => {
      goToQuestion(state.currentQuestion + 1);
    });
  }


  /* Submit */
  const submitButton = $('#submitExamButton');

  if (submitButton) {
    submitButton.addEventListener('click', openSubmitModal);
  }


  /* Konfirmasi submit */
  const confirmButton = $('#confirmSubmitButton');

  if (confirmButton) {
    confirmButton.addEventListener('click', submitExam);
  }


  /* Finish */
  const finishButton = $('#finishButton');

  if (finishButton) {
    finishButton.addEventListener('click', finishExam);
  }


  /* Sidebar */
  const openSidebarButton = $('#openSidebarButton');

  if (openSidebarButton) {
    openSidebarButton.addEventListener('click', openSidebar);
  }


  const closeSidebarButton = $('#closeSidebarButton');

  if (closeSidebarButton) {
    closeSidebarButton.addEventListener('click', closeSidebar);
  }


  const sidebarOverlay = $('#sidebarOverlay');

  if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', closeSidebar);
  }


  /* Modal close */
  $$('[data-close-modal]').forEach(button => {
    button.addEventListener('click', closeAllModals);
  });


  /* Alert OK */
  const alertOkButton = $('#alertOkButton');

  if (alertOkButton) {
    alertOkButton.addEventListener('click', closeAllModals);
  }


  /* Keyboard navigation */
  document.addEventListener('keydown', handleKeyboard);


  /* Sebelum meninggalkan halaman */
  window.addEventListener('beforeunload', handleBeforeUnload);
}


/* ================================================================
   LOAD SOAL
   ================================================================ */

async function loadQuestions() {

  if (!CONFIG.API_URL ||
      CONFIG.API_URL.includes('GANTI_DENGAN')) {
    throw new Error(
      'URL Web App Apps Script belum diisi pada CONFIG.API_URL di script.js.'
    );
  }

  const response = await apiGet('getQuestions');

  if (!response.success) {
    throw new Error(
      response.message || 'Soal gagal dimuat dari server.'
    );
  }

  if (!Array.isArray(response.questions)) {
    throw new Error('Format data soal dari server tidak valid.');
  }

  state.questions = response.questions;

  if (state.questions.length !== CONFIG.TOTAL_SOAL) {
    throw new Error(
      `Jumlah soal tidak sesuai. Server mengirim ${state.questions.length} soal, sedangkan aplikasi membutuhkan ${CONFIG.TOTAL_SOAL} soal.`
    );
  }

  state.questions.sort((a, b) => {
    return Number(a.no) - Number(b.no);
  });
}


/* ================================================================
   LOAD KELAS
   ================================================================ */

function populateClasses() {

  const select = $('#studentClass');

  if (!select) return;

  select.innerHTML = '';

  const placeholder = document.createElement('option');

  placeholder.value = '';
  placeholder.textContent = '— Pilih Kelas —';
  placeholder.disabled = true;
  placeholder.selected = true;

  select.appendChild(placeholder);

  CONFIG.KELAS.forEach(kelas => {

    const option = document.createElement('option');

    option.value = kelas;
    option.textContent = kelas;

    select.appendChild(option);
  });
}


/* ================================================================
   TANGGAL UJIAN
   ================================================================ */

function setDefaultExamDate() {

  const input = $('#examDate');

  if (!input) return;

  const today = new Date();

  const year = today.getFullYear();

  const month = String(today.getMonth() + 1).padStart(2, '0');

  const day = String(today.getDate()).padStart(2, '0');

  const todayString = `${year}-${month}-${day}`;

  input.value = todayString;

  input.max = todayString;
}


/* ================================================================
   START EXAM
   ================================================================ */

function handleStartExam(event) {

  if (event) {
    event.preventDefault();
  }

  if (state.started) return;

  const nameInput = $('#studentName');

  const classInput = $('#studentClass');

  const dateInput = $('#examDate');

  const agreement = $('#agreement');


  const name = nameInput
    ? nameInput.value.trim()
    : '';

  const kelas = classInput
    ? classInput.value.trim()
    : '';

  const examDate = dateInput
    ? dateInput.value
    : '';

  const agreed = agreement
    ? agreement.checked
    : false;


  /* Validasi nama */

  if (!name) {

    showAlert(
      'warning',
      'Nama Belum Diisi',
      'Silakan masukkan nama lengkap terlebih dahulu.'
    );

    if (nameInput) nameInput.focus();

    return;
  }


  if (name.length < 2) {

    showAlert(
      'warning',
      'Nama Tidak Valid',
      'Nama lengkap harus terdiri dari minimal 2 karakter.'
    );

    if (nameInput) nameInput.focus();

    return;
  }


  if (!kelas) {

    showAlert(
      'warning',
      'Kelas Belum Dipilih',
      'Silakan pilih kelas terlebih dahulu.'
    );

    if (classInput) classInput.focus();

    return;
  }


  if (!CONFIG.KELAS.includes(kelas)) {

    showAlert(
      'warning',
      'Kelas Tidak Valid',
      'Kelas yang dipilih tidak tersedia.'
    );

    return;
  }


  if (!examDate) {

    showAlert(
      'warning',
      'Tanggal Belum Dipilih',
      'Silakan pilih tanggal ujian.'
    );

    if (dateInput) dateInput.focus();

    return;
  }


  if (!agreed) {

    showAlert(
      'warning',
      'Persetujuan Diperlukan',
      'Silakan centang pernyataan bahwa data identitas sudah benar.'
    );

    return;
  }


  /* Simpan identitas */

  state.studentName = name;

  state.studentClass = kelas;

  state.examDate = examDate;

  state.currentQuestion = 0;

  state.answers = {};

  state.started = true;

  state.submitted = false;

  state.submitting = false;

  state.result = null;


  /* Buat submission ID */

  state.submissionId = generateSubmissionId();

  saveState();


  /* Tampilkan ujian */

  showScreen('examScreen');

  renderExam();

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}


/* ================================================================
   RENDER EXAM
   ================================================================ */

function renderExam() {

  updateHeader();

  renderQuestion();

  renderQuestionNumbers();

  updateNavigation();

  updateAnswerCounter();
}


/* ================================================================
   HEADER
   ================================================================ */

function updateHeader() {

  const nameElement = $('#headerStudentName');

  const classElement = $('#headerStudentClass');

  if (nameElement) {
    nameElement.textContent = state.studentName;
  }

  if (classElement) {
    classElement.textContent = state.studentClass;
  }

  updateProgress();
}


/* ================================================================
   PROGRESS
   ================================================================ */

function updateProgress() {

  const total = state.questions.length;

  const current = state.currentQuestion + 1;

  const progress = total > 0
    ? (current / total) * 100
    : 0;


  const progressText = $('#progressText');

  if (progressText) {
    progressText.textContent =
      `Soal ${current} dari ${total}`;
  }


  const progressBar = $('#progressBar');

  if (progressBar) {

    progressBar.style.width =
      `${progress}%`;

    progressBar.setAttribute(
      'aria-valuenow',
      String(progress)
    );
  }
}


/* ================================================================
   RENDER SOAL
   ================================================================ */

function renderQuestion() {

  const question = state.questions[state.currentQuestion];

  if (!question) return;


  const numberElement = $('#questionNumber');

  const typeElement = $('#questionType');

  const stimulusElement = $('#questionStimulus');

  const questionTextElement = $('#questionText');

  const instructionElement = $('#answerInstruction');

  const optionsElement = $('#answerOptions');

  const statusElement = $('#questionStatus');


  /* Nomor */

  if (numberElement) {
    numberElement.textContent =
      `SOAL ${question.no}`;
  }


  /* Bentuk */

  if (typeElement) {

    typeElement.textContent =
      getQuestionTypeLabel(question.bentuk);

    typeElement.className =
      `question-type type-${normalizeTypeClass(question.bentuk)}`;
  }


  /* Stimulus */

  if (stimulusElement) {

    if (question.stimulus) {

      stimulusElement.innerHTML =
        formatText(question.stimulus);

      stimulusElement.hidden = false;

    } else {

      stimulusElement.innerHTML = '';

      stimulusElement.hidden = true;
    }
  }


  /* Pertanyaan */

  if (questionTextElement) {

    questionTextElement.innerHTML =
      formatText(question.pertanyaan);
  }


  /* Instruksi */

  if (instructionElement) {

    instructionElement.textContent =
      getAnswerInstruction(question.bentuk);
  }


  /* Pilihan */

  if (optionsElement) {

    optionsElement.innerHTML = '';

    renderAnswerOptions(
      question,
      optionsElement
    );
  }


  /* Status */

  if (statusElement) {

    if (hasAnswer(question.no)) {

      statusElement.textContent =
        '✓ Jawaban sudah dipilih';

      statusElement.className =
        'question-status answered';

    } else {

      statusElement.textContent =
        'Belum dijawab';

      statusElement.className =
        'question-status unanswered';
    }
  }


  updateProgress();
}


/* ================================================================
   RENDER PILIHAN JAWABAN
   ================================================================ */

function renderAnswerOptions(question, container) {

  const type = normalizeQuestionType(question.bentuk);

  if (type === 'PG') {

    renderSingleChoice(
      question,
      container
    );

    return;
  }


  if (type === 'PGK') {

    renderMultipleChoice(
      question,
      container
    );

    return;
  }


  if (type === 'BS') {

    renderTrueFalse(
      question,
      container
    );

    return;
  }


  container.innerHTML =
    '<p class="answer-error">Bentuk soal tidak dikenali.</p>';
}


/* ================================================================
   PILIHAN GANDA
   ================================================================ */

function renderSingleChoice(question, container) {

  const options = getQuestionOptions(question);

  const currentAnswer =
    normalizePGAnswer(
      state.answers[question.no]
    );


  options.forEach(option => {

    if (!option.text) return;


    const label =
      createElement('label', 'answer-option');


    const input =
      document.createElement('input');

    input.type = 'radio';

    input.name =
      `question-${question.no}`;

    input.value =
      option.letter;

    input.checked =
      currentAnswer === option.letter;


    const letter =
      createElement(
        'span',
        'option-letter',
        option.letter
      );


    const text =
      createElement(
        'span',
        'option-text'
      );

    text.innerHTML =
      formatText(option.text);


    label.appendChild(input);

    label.appendChild(letter);

    label.appendChild(text);


    input.addEventListener(
      'change',
      () => {

        if (input.checked) {

          state.answers[question.no] =
            option.letter;

          saveState();

          updateAfterAnswer();
        }
      }
    );


    container.appendChild(label);
  });
}


/* ================================================================
   PILIHAN GANDA KOMPLEKS
   ================================================================ */

function renderMultipleChoice(question, container) {

  const options = getQuestionOptions(question);

  const currentAnswer =
    normalizePGKAnswer(
      state.answers[question.no]
    );

  const selected =
    new Set(
      currentAnswer.split('').filter(Boolean)
    );


  options.forEach(option => {

    if (!option.text) return;


    const label =
      createElement('label', 'answer-option multiple');


    const input =
      document.createElement('input');

    input.type = 'checkbox';

    input.name =
      `question-${question.no}`;

    input.value =
      option.letter;

    input.checked =
      selected.has(option.letter);


    const letter =
      createElement(
        'span',
        'option-letter',
        option.letter
      );


    const text =
      createElement(
        'span',
        'option-text'
      );

    text.innerHTML =
      formatText(option.text);


    label.appendChild(input);

    label.appendChild(letter);

    label.appendChild(text);


    input.addEventListener(
      'change',
      () => {

        const checked =
          $$(
            `input[name="question-${question.no}"]:checked`
          )
          .map(input => input.value);


        state.answers[question.no] =
          normalizePGKAnswer(
            checked.join('')
          );


        saveState();

        updateAfterAnswer();
      }
    );


    container.appendChild(label);
  });
}


/* ================================================================
   BENAR / SALAH
   ================================================================ */

function renderTrueFalse(question, container) {

  const currentAnswer =
    normalizeBSAnswer(
      state.answers[question.no]
    );


  const options = [
    {
      value: 'BENAR',
      label: 'Benar',
      symbol: '✓'
    },
    {
      value: 'SALAH',
      label: 'Salah',
      symbol: '✕'
    }
  ];


  options.forEach(option => {

    const label =
      createElement(
        'label',
        'answer-option true-false'
      );


    const input =
      document.createElement('radio');

    /*
     * Fallback aman jika browser tidak mengenali
     * custom element di atas.
     */
    input =
      document.createElement('input');

    input.type = 'radio';

    input.name =
      `question-${question.no}`;

    input.value =
      option.value;

    input.checked =
      currentAnswer === option.value;


    const symbol =
      createElement(
        'span',
        'option-letter',
        option.symbol
      );


    const text =
      createElement(
        'span',
        'option-text',
        option.label
      );


    label.appendChild(input);

    label.appendChild(symbol);

    label.appendChild(text);


    input.addEventListener(
      'change',
      () => {

        if (input.checked) {

          state.answers[question.no] =
            option.value;

          saveState();

          updateAfterAnswer();
        }
      }
    );


    container.appendChild(label);
  });
}


/* ================================================================
   UPDATE SETELAH MEMILIH JAWABAN
   ================================================================ */

function updateAfterAnswer() {

  const question =
    state.questions[state.currentQuestion];


  const statusElement =
    $('#questionStatus');


  if (statusElement && question) {

    if (hasAnswer(question.no)) {

      statusElement.textContent =
        '✓ Jawaban sudah dipilih';

      statusElement.className =
        'question-status answered';

    } else {

      statusElement.textContent =
        'Belum dijawab';

      statusElement.className =
        'question-status unanswered';
    }
  }


  renderQuestionNumbers();

  updateAnswerCounter();

  updateNavigation();

  saveState();
}


/* ================================================================
   NOMOR SOAL SIDEBAR
   ================================================================ */

function renderQuestionNumbers() {

  const container =
    $('#questionNumbers');

  if (!container) return;

  container.innerHTML = '';


  state.questions.forEach(
    (question, index) => {

      const button =
        document.createElement('button');

      button.type = 'button';

      button.className =
        'question-number';


      if (index === state.currentQuestion) {

        button.classList.add('active');
      }


      if (hasAnswer(question.no)) {

        button.classList.add('answered');
      }


      button.textContent =
        question.no;


      button.setAttribute(
        'aria-label',
        `Buka soal ${question.no}`
      );


      button.addEventListener(
        'click',
        () => {

          goToQuestion(index);

          closeSidebar();
        }
      );


      container.appendChild(button);
    }
  );
}


/* ================================================================
   NAVIGASI
   ================================================================ */

function updateNavigation() {

  const prevButton =
    $('#prevQuestionButton');

  const nextButton =
    $('#nextQuestionButton');

  const submitArea =
    $('#submitArea');


  const isFirst =
    state.currentQuestion === 0;

  const isLast =
    state.currentQuestion ===
    state.questions.length - 1;


  if (prevButton) {

    prevButton.disabled =
      isFirst;
  }


  if (nextButton) {

    nextButton.disabled =
      isLast;
  }


  if (submitArea) {

    submitArea.hidden =
      !isLast;
  }
}


/* ================================================================
   PINDAH SOAL
   ================================================================ */

function goToQuestion(index) {

  if (!state.started) return;

  if (state.submitted) return;


  if (
    index < 0 ||
    index >= state.questions.length
  ) {
    return;
  }


  state.currentQuestion =
    index;


  renderQuestion();

  renderQuestionNumbers();

  updateNavigation();

  updateAnswerCounter();

  saveState();


  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}


/* ================================================================
   COUNTER JAWABAN
   ================================================================ */

function updateAnswerCounter() {

  const counter =
    $('#answeredCount');

  if (!counter) return;


  const answered =
    countAnswered();


  counter.textContent =
    `${answered}/${state.questions.length}`;
}


/* ================================================================
   HITUNG SOAL TERJAWAB
   ================================================================ */

function countAnswered() {

  return state.questions.filter(
    question =>
      hasAnswer(question.no)
  ).length;
}


/* ================================================================
   CEK JAWABAN
   ================================================================ */

function hasAnswer(questionNo) {

  const answer =
    state.answers[questionNo];

  if (
    answer === undefined ||
    answer === null
  ) {
    return false;
  }


  if (typeof answer === 'string') {

    return answer.trim() !== '';
  }


  if (Array.isArray(answer)) {

    return answer.length > 0;
  }


  return Boolean(answer);
}


/* ================================================================
   MODAL SUBMIT
   ================================================================ */

function openSubmitModal() {

  if (state.submitting) return;

  const answered =
    countAnswered();

  const total =
    state.questions.length;

  const unanswered =
    total - answered;


  const answeredElement =
    $('#modalAnsweredCount');

  const unansweredElement =
    $('#modalUnansweredCount');

  const warning =
    $('#unansweredWarning');


  if (answeredElement) {

    answeredElement.textContent =
      answered;
  }


  if (unansweredElement) {

    unansweredElement.textContent =
      unanswered;
  }


  if (warning) {

    warning.hidden =
      unanswered === 0;
  }


  openModal('confirmSubmitModal');
}


/* ================================================================
   SUBMIT UJIAN
   ================================================================ */

async function submitExam() {

  if (state.submitting) return;

  if (state.submitted) return;


  closeAllModals();


  const unanswered =
    state.questions.filter(
      question =>
        !hasAnswer(question.no)
    );


  /*
   * Soal kosong tetap boleh dikirim.
   * Backend akan menghitungnya sebagai salah.
   */


  state.submitting = true;


  showScreen('submittingScreen');


  updateSubmitProgress(
    10,
    'Menyiapkan jawaban...'
  );


  try {

    const payload = {

      name:
        state.studentName,

      kelas:
        state.studentClass,

      examDate:
        state.examDate,

      submissionId:
        state.submissionId,

      answers:
        buildSubmissionAnswers()
    };


    updateSubmitProgress(
      25,
      'Mengirim jawaban ke server...'
    );


    const response =
      await apiPost(
        'submitExam',
        payload
      );


    updateSubmitProgress(
      75,
      'Memproses hasil ujian...'
    );


    if (!response.success) {

      throw new Error(
        response.message ||
        'Jawaban gagal disimpan.'
      );
    }


    updateSubmitProgress(
      95,
      'Menampilkan hasil...'
    );


    state.result =
      response.result || response;


    state.submitted = true;

    state.submitting = false;


    clearSavedState();


    renderResult();


    updateSubmitProgress(
      100,
      'Ujian berhasil dikirim.'
    );


    setTimeout(() => {

      showScreen('resultScreen');

      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });

    }, 400);


  } catch (error) {

    console.error(
      'SUBMIT ERROR:',
      error
    );


    state.submitting = false;


    showScreen('examScreen');


    showAlert(
      'error',
      'Gagal Mengirim',
      error.message ||
      'Jawaban belum berhasil disimpan. Silakan coba lagi.'
    );
  }
}


/* ================================================================
   DATA JAWABAN UNTUK SERVER
   ================================================================ */

function buildSubmissionAnswers() {

  const answers = {};


  state.questions.forEach(
    question => {

      const no =
        String(question.no);

      let answer =
        state.answers[no];


      if (
        answer === undefined ||
        answer === null
      ) {

        answer = '';
      }


      const type =
        normalizeQuestionType(
          question.bentuk
        );


      if (type === 'PG') {

        answer =
          normalizePGAnswer(answer);
      }


      else if (type === 'PGK') {

        answer =
          normalizePGKAnswer(answer);
      }


      else if (type === 'BS') {

        answer =
          normalizeBSAnswer(answer);
      }


      answers[no] =
        answer;
    }
  );


  return answers;
}


/* ================================================================
   HASIL UJIAN
   ================================================================ */

function renderResult() {

  const result =
    state.result || {};


  const score =
    Number(
      result.nilai ??
      result.score ??
      0
    );


  const correct =
    Number(
      result.benar ??
      result.correct ??
      0
    );


  const wrong =
    Number(
      result.salah ??
      result.wrong ??
      0
    );


  const total =
    Number(
      result.totalSoal ??
      result.total ??
      state.questions.length
    );


  const examId =
    result.idUjian ??
    result.examId ??
    result.id ??
    state.submissionId;


  const date =
    result.tanggal ??
    result.examDate ??
    state.examDate;


  setText(
    '#resultStudentName',
    result.nama || state.studentName
  );


  setText(
    '#resultStudentClass',
    result.kelas || state.studentClass
  );


  setText(
    '#resultScore',
    formatScore(score)
  );


  setText(
    '#resultCorrect',
    String(correct)
  );


  setText(
    '#resultWrong',
    String(wrong)
  );


  setText(
    '#resultTotal',
    String(total)
  );


  setText(
    '#resultExamId',
    examId
  );


  setText(
    '#resultDate',
    formatDateDisplay(date)
  );


  const icon =
    $('#resultIcon');


  if (icon) {

    if (score >= 90) {

      icon.textContent = '🏆';

    } else if (score >= 80) {

      icon.textContent = '🎉';

    } else if (score >= 70) {

      icon.textContent = '😊';

    } else {

      icon.textContent = '💪';
    }
  }
}


/* ================================================================
   FINISH
   ================================================================ */

function finishExam() {

  closeAllModals();

  state.started = false;

  state.submitted = true;

  clearSavedState();

  resetApplication();

  showScreen('finishedScreen');

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}


/* ================================================================
   RESET APLIKASI
   ================================================================ */

function resetApplication() {

  state.currentQuestion = 0;

  state.studentName = '';

  state.studentClass = '';

  state.examDate = '';

  state.answers = {};

  state.started = false;

  state.submitted = false;

  state.submitting = false;

  state.submissionId = '';

  state.result = null;


  const form =
    $('#identityForm');

  if (form) {

    form.reset();
  }


  setDefaultExamDate();


  const classInput =
    $('#studentClass');

  if (classInput) {

    classInput.value = '';
  }


  const agreement =
    $('#agreement');

  if (agreement) {

    agreement.checked = false;
  }
}


/* ================================================================
   SCREEN MANAGEMENT
   ================================================================ */

function showScreen(screenId) {

  const screens = [
    'loadingScreen',
    'startScreen',
    'examScreen',
    'submittingScreen',
    'resultScreen',
    'finishedScreen'
  ];


  screens.forEach(id => {

    const element =
      document.getElementById(id);

    if (!element) return;


    if (id === screenId) {

      element.hidden = false;

      element.classList.add('active');

    } else {

      element.hidden = true;

      element.classList.remove('active');
    }
  });


  closeSidebar();

  closeAllModals();
}


/* ================================================================
   SUBMIT PROGRESS
   ================================================================ */

function updateSubmitProgress(
  percent,
  message
) {

  const progressBar =
    $('#uploadProgressBar');

  const statusText =
    $('#submitStatusText');


  if (progressBar) {

    progressBar.style.width =
      `${Math.max(0, Math.min(100, percent))}%`;

    progressBar.setAttribute(
      'aria-valuenow',
      String(percent)
    );
  }


  if (statusText) {

    statusText.textContent =
      message || '';
  }
}


/* ================================================================
   SIDEBAR
   ================================================================ */

function openSidebar() {

  const sidebar =
    $('#questionSidebar');

  const overlay =
    $('#sidebarOverlay');


  if (sidebar) {

    sidebar.classList.add('open');

    sidebar.setAttribute(
      'aria-hidden',
      'false'
    );
  }


  if (overlay) {

    overlay.classList.add('active');
  }
}


function closeSidebar() {

  const sidebar =
    $('#questionSidebar');

  const overlay =
    $('#sidebarOverlay');


  if (sidebar) {

    sidebar.classList.remove('open');

    sidebar.setAttribute(
      'aria-hidden',
      'true'
    );
  }


  if (overlay) {

    overlay.classList.remove('active');
  }
}


/* ================================================================
   MODAL
   ================================================================ */

function openModal(modalId) {

  const container =
    $('#modalContainer');

  if (!container) return;


  container.hidden = false;

  container.classList.add('active');


  $$('.modal').forEach(modal => {

    modal.hidden =
      modal.id !== modalId;

    if (modal.id === modalId) {

      modal.classList.add('active');

    } else {

      modal.classList.remove('active');
    }
  });


  document.body.classList.add(
    'modal-open'
  );
}


function closeAllModals() {

  const container =
    $('#modalContainer');

  const alertModal =
    $('#alertModal');


  if (container) {

    container.hidden = true;

    container.classList.remove('active');
  }


  if (alertModal) {

    alertModal.hidden = true;

    alertModal.classList.remove('active');
  }


  $$('.modal').forEach(modal => {

    modal.hidden = true;

    modal.classList.remove('active');
  });


  document.body.classList.remove(
    'modal-open'
  );
}


/* ================================================================
   ALERT
   ================================================================ */

function showAlert(
  type,
  title,
  message
) {

  const modal =
    $('#alertModal');

  if (!modal) {

    window.alert(
      `${title}\n\n${message}`
    );

    return;
  }


  const icon =
    $('#alertIcon');

  const titleElement =
    $('#alertTitle');

  const messageElement =
    $('#alertMessage');


  const icons = {

    success: '✅',

    error: '❌',

    warning: '⚠️',

    info: 'ℹ️'
  };


  if (icon) {

    icon.textContent =
      icons[type] || icons.info;
  }


  if (titleElement) {

    titleElement.textContent =
      title || 'Informasi';
  }


  if (messageElement) {

    messageElement.textContent =
      message || '';
  }


  modal.hidden = false;

  modal.classList.add('active');

  document.body.classList.add(
    'modal-open'
  );
}


/* ================================================================
   TOAST
   ================================================================ */

function showToast(
  message,
  type = 'info'
) {

  const container =
    $('#toastContainer');

  if (!container) return;


  const toast =
    document.createElement('div');

  toast.className =
    `toast toast-${type}`;


  toast.textContent =
    message;


  container.appendChild(toast);


  requestAnimationFrame(() => {

    toast.classList.add('show');
  });


  setTimeout(() => {

    toast.classList.remove('show');

    setTimeout(() => {

      toast.remove();

    }, 300);

  }, 3000);
}


/* ================================================================
   API GET
   ================================================================ */

async function apiGet(action, params = {}) {

  const url =
    new URL(CONFIG.API_URL);


  url.searchParams.set(
    'action',
    action
  );


  Object.entries(params).forEach(
    ([key, value]) => {

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
    }
  );


  const controller =
    new AbortController();


  const timeout =
    setTimeout(
      () => controller.abort(),
      CONFIG.REQUEST_TIMEOUT
    );


  try {

    const response =
      await fetch(
        url.toString(),
        {
          method: 'GET',
          cache: 'no-store',
          signal: controller.signal
        }
      );


    if (!response.ok) {

      throw new Error(
        `Server HTTP ${response.status}`
      );
    }


    const data =
      await response.json();


    return data;


  } catch (error) {

    if (error.name === 'AbortError') {

      throw new Error(
        'Permintaan ke server terlalu lama. Periksa koneksi internet.'
      );
    }


    throw error;

  } finally {

    clearTimeout(timeout);
  }
}


/* ================================================================
   API POST
   ================================================================ */

async function apiPost(
  action,
  data = {}
) {

  const controller =
    new AbortController();


  const timeout =
    setTimeout(
      () => controller.abort(),
      CONFIG.REQUEST_TIMEOUT
    );


  try {

    /*
     * Backend Apps Script membaca POST
     * melalui e.postData.contents.
     */

    const response =
      await fetch(
        CONFIG.API_URL,
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'text/plain;charset=utf-8'
          },

          body: JSON.stringify({
            action,
            ...data
          }),

          signal: controller.signal
        }
      );


    if (!response.ok) {

      throw new Error(
        `Server HTTP ${response.status}`
      );
    }


    const result =
      await response.json();


    return result;


  } catch (error) {

    if (error.name === 'AbortError') {

      throw new Error(
        'Pengiriman terlalu lama. Periksa koneksi internet lalu coba kembali.'
      );
    }


    throw error;

  } finally {

    clearTimeout(timeout);
  }
}


/* ================================================================
   NORMALISASI BENTUK SOAL
   ================================================================ */

function normalizeQuestionType(type) {

  const value =
    String(type || '')
      .trim()
      .toUpperCase();


  if (
    value === 'PG' ||
    value === 'PILIHAN GANDA'
  ) {

    return 'PG';
  }


  if (
    value === 'PGK' ||
    value.includes('KOMPLEKS')
  ) {

    return 'PGK';
  }


  if (
    value === 'B/S' ||
    value === 'BS' ||
    value === 'BENAR/SALAH'
  ) {

    return 'BS';
  }


  return value;
}


function normalizeTypeClass(type) {

  return normalizeQuestionType(type)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');
}


/* ================================================================
   LABEL BENTUK SOAL
   ================================================================ */

function getQuestionTypeLabel(type) {

  const normalized =
    normalizeQuestionType(type);


  switch (normalized) {

    case 'PG':
      return 'Pilihan Ganda';

    case 'PGK':
      return 'Pilihan Ganda Kompleks';

    case 'BS':
      return 'Benar / Salah';

    default:
      return type || 'Soal';
  }
}


/* ================================================================
   INSTRUKSI JAWABAN
   ================================================================ */

function getAnswerInstruction(type) {

  const normalized =
    normalizeQuestionType(type);


  switch (normalized) {

    case 'PG':

      return 'Pilih satu jawaban yang paling tepat.';


    case 'PGK':

      return 'Pilih semua jawaban yang dianggap benar.';


    case 'BS':

      return 'Tentukan apakah pernyataan tersebut Benar atau Salah.';


    default:

      return 'Pilih jawaban yang sesuai.';
  }
}


/* ================================================================
   PILIHAN SOAL
   ================================================================ */

function getQuestionOptions(question) {

  return [
    {
      letter: 'A',
      text: question.pilihanA ?? question.A ?? ''
    },
    {
      letter: 'B',
      text: question.pilihanB ?? question.B ?? ''
    },
    {
      letter: 'C',
      text: question.pilihanC ?? question.C ?? ''
    },
    {
      letter: 'D',
      text: question.pilihanD ?? question.D ?? ''
    }
  ];
}


/* ================================================================
   NORMALISASI PG
   ================================================================ */

function normalizePGAnswer(answer) {

  if (
    answer === undefined ||
    answer === null
  ) {

    return '';
  }


  return String(answer)
    .trim()
    .toUpperCase()
    .replace(/[^ABCD]/g, '')
    .charAt(0);
}


/* ================================================================
   NORMALISASI PGK
   ================================================================ */

function normalizePGKAnswer(answer) {

  if (
    answer === undefined ||
    answer === null
  ) {

    return '';
  }


  let value = '';


  if (Array.isArray(answer)) {

    value =
      answer.join('');

  } else {

    value =
      String(answer);
  }


  return [
    ...new Set(
      value
        .toUpperCase()
        .replace(/[^ABCD]/g, '')
        .split('')
    )
  ]
    .sort()
    .join('');
}


/* ================================================================
   NORMALISASI BENAR / SALAH
   ================================================================ */

function normalizeBSAnswer(answer) {

  if (
    answer === undefined ||
    answer === null
  ) {

    return '';
  }


  const value =
    String(answer)
      .trim()
      .toUpperCase();


  if (
    value === 'BENAR' ||
    value === 'B' ||
    value === 'TRUE'
  ) {

    return 'BENAR';
  }


  if (
    value === 'SALAH' ||
    value === 'S' ||
    value === 'FALSE'
  ) {

    return 'SALAH';
  }


  return '';
}


/* ================================================================
   FORMAT TEKS
   ================================================================ */

function formatText(text) {

  if (
    text === undefined ||
    text === null
  ) {

    return '';
  }


  const value =
    String(text);


  /*
   * Escape HTML terlebih dahulu.
   */

  const escaped =
    escapeHTML(value);


  /*
   * Pertahankan line break
   * dari spreadsheet.
   */

  return escaped
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n/g, '<br>');
}


/* ================================================================
   ESCAPE HTML
   ================================================================ */

function escapeHTML(value) {

  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}


/* ================================================================
   CREATE ELEMENT
   ================================================================ */

function createElement(
  tag,
  className,
  textContent = ''
) {

  const element =
    document.createElement(tag);


  if (className) {

    element.className =
      className;
  }


  if (textContent !== '') {

    element.textContent =
      textContent;
  }


  return element;
}


/* ================================================================
   SET TEXT
   ================================================================ */

function setText(
  selector,
  value
) {

  const element =
    $(selector);

  if (!element) return;

  element.textContent =
    value === undefined ||
    value === null
      ? ''
      : String(value);
}


/* ================================================================
   FORMAT NILAI
   ================================================================ */

function formatScore(score) {

  const number =
    Number(score);


  if (!Number.isFinite(number)) {

    return '0';
  }


  if (
    Number.isInteger(number)
  ) {

    return String(number);
  }


  return number
    .toFixed(2)
    .replace(/\.00$/, '')
    .replace(/(\.\d)0$/, '$1');
}


/* ================================================================
   FORMAT TANGGAL
   ================================================================ */

function formatDateDisplay(dateValue) {

  if (!dateValue) return '-';


  const date =
    new Date(
      `${dateValue}T00:00:00`
    );


  if (Number.isNaN(date.getTime())) {

    return String(dateValue);
  }


  return new Intl.DateTimeFormat(
    'id-ID',
    {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }
  ).format(date);
}


/* ================================================================
   GENERATE SUBMISSION ID
   ================================================================ */

function generateSubmissionId() {

  const now =
    new Date();


  const timestamp =
    now.getTime();


  const random =
    Math.random()
      .toString(36)
      .substring(2, 10)
      .toUpperCase();


  return `SUB-${timestamp}-${random}`;
}


/* ================================================================
   LOCAL STORAGE
   ================================================================ */

function saveState() {

  if (!state.started) return;


  try {

    const data = {

      studentName:
        state.studentName,

      studentClass:
        state.studentClass,

      examDate:
        state.examDate,

      currentQuestion:
        state.currentQuestion,

      answers:
        state.answers,

      started:
        state.started,

      submissionId:
        state.submissionId
    };


    localStorage.setItem(
      CONFIG.STORAGE_KEY,
      JSON.stringify(data)
    );


    localStorage.setItem(
      CONFIG.SUBMISSION_KEY,
      state.submissionId
    );

  } catch (error) {

    console.warn(
      'Gagal menyimpan state:',
      error
    );
  }
}


/* ================================================================
   LOAD SAVED STATE
   ================================================================ */

function loadSavedState() {

  try {

    const raw =
      localStorage.getItem(
        CONFIG.STORAGE_KEY
      );


    if (!raw) return;


    const saved =
      JSON.parse(raw);


    if (
      !saved ||
      !saved.studentName ||
      !saved.studentClass ||
      !saved.submissionId
    ) {

      return;
    }


    /*
     * Jangan otomatis melanjutkan ujian.
     * Data hanya dipulihkan ke form.
     */

    const nameInput =
      $('#studentName');

    const classInput =
      $('#studentClass');

    const dateInput =
      $('#examDate');


    if (nameInput) {

      nameInput.value =
        saved.studentName;
    }


    if (classInput) {

      classInput.value =
        saved.studentClass;
    }


    if (
      dateInput &&
      saved.examDate
    ) {

      dateInput.value =
        saved.examDate;
    }

  } catch (error) {

    console.warn(
      'State tersimpan tidak dapat dibaca:',
      error
    );
  }
}


/* ================================================================
   RESTORE FORM
   ================================================================ */

function restoreIdentityForm() {

  try {

    const raw =
      localStorage.getItem(
        CONFIG.STORAGE_KEY
      );


    if (!raw) return;


    const saved =
      JSON.parse(raw);


    if (!saved) return;


    const nameInput =
      $('#studentName');

    const classInput =
      $('#studentClass');

    const dateInput =
      $('#examDate');


    if (
      nameInput &&
      saved.studentName
    ) {

      nameInput.value =
        saved.studentName;
    }


    if (
      classInput &&
      saved.studentClass &&
      CONFIG.KELAS.includes(
        saved.studentClass
      )
    ) {

      classInput.value =
        saved.studentClass;
    }


    if (
      dateInput &&
      saved.examDate
    ) {

      dateInput.value =
        saved.examDate;
    }

  } catch (error) {

    console.warn(error);
  }
}


/* ================================================================
   CLEAR STORAGE
   ================================================================ */

function clearSavedState() {

  try {

    localStorage.removeItem(
      CONFIG.STORAGE_KEY
    );

    localStorage.removeItem(
      CONFIG.SUBMISSION_KEY
    );

  } catch (error) {

    console.warn(
      'Gagal membersihkan storage:',
      error
    );
  }
}


/* ================================================================
   KEYBOARD NAVIGATION
   ================================================================ */

function handleKeyboard(event) {

  if (!state.started) return;

  if (state.submitting) return;

  if (state.submitted) return;


  /*
   * Jangan menjalankan shortcut ketika
   * pengguna sedang mengetik.
   */

  const target =
    event.target;


  if (
    target &&
    (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT'
    )
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
   BEFORE UNLOAD
   ================================================================ */

function handleBeforeUnload(event) {

  if (
    state.started &&
    !state.submitted &&
    !state.submitting
  ) {

    saveState();

    event.preventDefault();

    event.returnValue = '';
  }
}


/* ================================================================
   GLOBAL ERROR HANDLER
   ================================================================ */

window.addEventListener(
  'error',
  event => {

    console.error(
      'Global error:',
      event.error || event.message
    );
  }
);


window.addEventListener(
  'unhandledrejection',
  event => {

    console.error(
      'Unhandled promise rejection:',
      event.reason
    );
  }
);


/* ================================================================
   EXPOSE OPTIONAL DEBUG OBJECT
   ================================================================ */

window.UjianBahasaIndonesia = {

  state,

  config: CONFIG,

  reloadQuestions:
    loadQuestions,

  showToast,

  showAlert
};
```

**Catatan penting sebelum dipasang:** ganti bagian ini:

```javascript
API_URL: 'GANTI_DENGAN_URL_WEB_APP_APPS_SCRIPT',
```

dengan URL **Web App Apps Script** yang berakhiran `/exec`, misalnya:

```javascript
API_URL: 'https://script.google.com/macros/s/XXXXXXXXXXXX/exec',
```

`script.js` di atas sudah disusun mengikuti ID elemen pada `index.html` terakhir dan struktur backend `Code.gs` kita: **40 soal → PG 26, PGK 8, B/S 6 → submit → `HASIL_UJIAN` + `JAWABAN_UJIAN`**.

**Ada satu bagian yang sengaja saya perhatikan:** PGK dinormalisasi menjadi urutan huruf seperti `ABD`, sehingga cocok dengan mekanisme pemeriksaan kunci PGK di `Code.gs`.

Langkah berikutnya adalah **`style.css`**, yang bisa kita buat penuh warna, 3D, responsif HP/desktop, kartu soal, sidebar nomor soal, tombol, modal, progress bar, dan halaman hasil tanpa mengubah `Code.gs`, `index.html`, maupun fungsi utama `script.js`.
