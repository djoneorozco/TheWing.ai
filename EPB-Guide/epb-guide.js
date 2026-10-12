
/**
 * EPB-Guide · mobile-first frontend controller
 * Handles screen navigation, Amy interview sheets, example browsing,
 * deterministic evidence-based statements, charts, and copy actions.
 *
 * FRONTEND DEMO ONLY — no live AI backend, persistence or network calls.
 * Connect TheWing through a separately reviewed API adapter when ready.
 */

(() => {
  'use strict';

  // FRONTEND PROTOTYPE: no AI endpoint, login, or data storage is used here.
  // Your TheWing backend can later replace the simple local coaching functions.

  const $ = (id) => document.getElementById(id);

  const state = {
    screen: 'home',
    mode: 'improve',
    draft: '',
    story: '',
    tone: 'clear',
    sectionSize: null,
    qualifiedBefore: null,
    newQualificationsConfirmed: false,
    outcome: '',
    askedTraining: false,
    alternative: 0,
    shortened: false
  };

  const screens = [
    'home',
    'editor',
    'refine',
    'examples',
    'workshop'
  ];

  const lessons = [
    {
      heading: 'What did you do?',
      body: 'Start with the specific action or behavior you performed. Your reader should understand your contribution.',
      example: '“Trained 3 Airmen on 5-level tasks.”',
      question: 'Ask yourself: What did I personally do?'
    },
    {
      heading: 'What changed?',
      body: 'Add a verified result. Show the difference you made, whether measurable or qualitative.',
      example: '“All 3 Airmen completed the required certification.”',
      question: 'Ask yourself: What was different after my work?'
    },
    {
      heading: 'Why did it matter?',
      body: 'Connect your action to a confirmed organizational or mission result. If you do not know, ask—not invent.',
      example: '“Completed a deployment-required qualification before the member’s deadline.” (Only if confirmed.)',
      question: 'Ask yourself: What did my result make possible?'
    }
  ];

  const examples = {
    training: [
      'Training & qualification',
      '[Action] Trained [number] Airmen on [specific task], resulting in [verified qualification or result].',
      'Who gained a skill, and what can they now do that they could not do before?'
    ],
    process: [
      'Process improvement',
      '[Action] Changed [process], reducing [metric] from [before] to [after].',
      'What changed operationally because the process got faster or better?'
    ],
    leadership: [
      'Leadership & initiative',
      '[Action] Took responsibility for [task/team] during [verified situation], resulting in [outcome].',
      'What responsibility did you take, and why was it necessary?'
    ],
    resources: [
      'Resource management',
      '[Action] Managed [resource] to achieve [measurable or described result].',
      'What did you protect, save, allocate, or enable?'
    ]
  };

  let previousFocus = null;
  let currentSheet = null;
  let currentSheetCallback = null;
  let toastTimeout = null;

  const svg = (id) =>
    `<svg aria-hidden="true"><use href="#${id}"/></svg>`;

  const safeNumber = (value) => {
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? n : null;
  };

  const fmt = (n) =>
    Number(n).toLocaleString('en-US', {
      maximumFractionDigits: 1
    });

  const percent = (n, d) => d > 0 ? 100 * n / d : null;

  const source = () => `${state.draft} ${state.story}`;

  const training = () =>
    /\b(train(?:ed|ing)?|certif(?:ied|ication|ications)?|5[\s-]?level|qualified|qualifying|mentored)\b/i.test(source());

  const paint = () =>
    /\bpaint(?:ing|ed)?\b/i.test(source());

  // ============================================================
  // 1. EXTRACT FACTS
  // ============================================================

  function facts() {
    const text = source();

    // Extract counts only when directly associated with Airmen and training.
    const countMatch =
      text.match(
        /\b(?:train(?:ed|ing)?|certif(?:ied|ication)?|mentored)\s+(\d+)\s*(?:airmen|amn|members|people)\b/i
      ) ||
      text.match(
        /\b(\d+)\s*(?:airmen|amn|members|people)\b(?=[^.!?]{0,65}(?:train|certif))/i
      );

    const trained = countMatch ? Number(countMatch[1]) : null;

    const hourMatch = text.match(
      /\b(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)\b/i
    );

    const hours = hourMatch ? Number(hourMatch[1]) : null;

    const beforeAfter = text.match(
      /\bfrom\s+(\d+(?:\.\d+)?)\s*(days?|hrs?|hours?)\s+to\s+(\d+(?:\.\d+)?)\s*(days?|hrs?|hours?)\b/i
    );

    const before = beforeAfter ? Number(beforeAfter[1]) : null;
    const after = beforeAfter ? Number(beforeAfter[3]) : null;

    const certified =
      /\ball\b[^.!?]{0,40}\b(?:certified|qualified|certifications?|qualifications?)\b/i.test(text);

    return {
      trained,
      hours,
      before,
      after,
      certified,
      sole: /\b(?:only|sole)\s+qualified\b/i.test(text),
      srA: /\bsra\b/i.test(text),
      deployment: /\bdeploy(?:ment|ing|ed)?\b/i.test(text)
    };
  }

  // ============================================================
  // 2. SCREEN NAVIGATION
  // ============================================================

  function showScreen(name) {
    screens.forEach(s => {
      $(`screen-${s}`).hidden = s !== name;
    });

    $('home-header').hidden = name !== 'home';
    $('editor-dock').hidden = name !== 'editor';

    $('composer-form').hidden =
      !(name === 'home' || name === 'refine');

    $('composer-input').placeholder =
      name === 'refine'
        ? 'Tell me what to change or add…'
        : 'Not sure where to begin? Ask Amy…';

    state.screen = name;

    window.scrollTo({
      top: 0,
      behavior: 'instant'
    });

    if (name === 'refine') {
      renderRefinement();
    }
  }

  function toast(message) {
    const el = $('toast');

    el.textContent = message;
    el.classList.add('is-visible');

    clearTimeout(toastTimeout);

    toastTimeout = setTimeout(() => {
      el.classList.remove('is-visible');
    }, 3100);
  }

  function begin(mode) {
    state.mode = mode;

    if (mode === 'examples') {
      showScreen('examples');
      return;
    }

    $('draft-input').placeholder =
      mode === 'scratch'
        ? 'I trained three Airmen on a new task…'
        : 'Paste your current bullet, or describe it here…';

    $('draft-hint').textContent =
      mode === 'scratch'
        ? 'Just tell the story. Amy will help you discover the scope and result.'
        : 'Your current bullet is a starting point—not something you have to get perfect.';

    showScreen('editor');

    setTimeout(() => {
      $('draft-input').focus({ preventScroll: true });
    }, 100);
  }

  function goBack(dest) {
    showScreen(dest);
  }

  // ============================================================
  // 3. BOTTOM-UP ELICITATION
  // ============================================================

  function clearSheet() {
    $('sheet-backdrop').classList.remove('is-open');

    document.body.classList.remove('sheet-open');

    const target = previousFocus;

    setTimeout(() => {
      $('sheet-backdrop').hidden = true;
      $('sheet-body').replaceChildren();

      if (target?.isConnected) {
        target.focus({ preventScroll: true });
      }
    }, 240);
  }

  function openSheet(type, callback = null) {
    previousFocus = document.activeElement;

    currentSheet = type;
    currentSheetCallback = callback;

    $('sheet-error').hidden = true;
    $('sheet-error').textContent = '';

    $('sheet-skip').hidden = false;
    $('sheet-submit').textContent = 'Continue →';

    const body = $('sheet-body');
    body.replaceChildren();

    const html = (s) => {
      body.innerHTML = s;
    };

    let title = '';
    let subtitle = '';

    // ----------------------------------------------------------
    // EXPLAIN THE BULLET
    // ----------------------------------------------------------

    if (type === 'story') {
      title = 'Tell me what really happened';

      subtitle =
        'Don’t worry about bullet writing. Explain it like you would to a teammate.';

      html(`
        <label class="sheet-label" for="story-input">
          The story behind your accomplishment
        </label>

        <textarea
          id="story-input"
          class="sheet-textarea"
          rows="7"
          maxlength="2400"
          placeholder="For example: I had just made SrA. Two other qualified Airmen PCS'd, leaving me as the only qualified trainer…"
        ></textarea>

        <p class="help-note">
          Avoid classified details, names, sensitive deployment
          information, or other restricted information.
        </p>
      `);

      $('story-input').value = state.story;

      $('sheet-submit').textContent = 'Save my story →';
      $('sheet-skip').textContent = 'Not now';
    }

    // ----------------------------------------------------------
    // TRAINING ELICITATION
    // ----------------------------------------------------------

    else if (type === 'training') {
      title = 'Amy needs 2 more details';

      subtitle =
        'These numbers help show the scale of your training. Leave anything you don’t know blank.';

      html(`
        <div class="sheet-field">
          <label class="sheet-label" for="total-airmen">
            How many total Airmen are in your section?
          </label>

          <input
            id="total-airmen"
            class="sheet-input"
            type="number"
            min="1"
            max="99999"
            step="1"
            inputmode="numeric"
            placeholder="e.g. 11"
          >
        </div>

        <div class="sheet-field">
          <label class="sheet-label" for="previously-qualified">
            How many were already qualified on this same task
            <em>before</em> your training?
          </label>

          <input
            id="previously-qualified"
            class="sheet-input"
            type="number"
            min="0"
            max="99999"
            step="1"
            inputmode="numeric"
            placeholder="e.g. 2"
          >
        </div>

        <label class="sheet-checkbox">
          <input id="new-trainees" type="checkbox">

          <span>
            The Airmen I certified are <strong>new additions</strong>
            to that previously qualified count.
          </span>
        </label>
      `);

      $('total-airmen').value = state.sectionSize ?? '';

      $('previously-qualified').value =
        state.qualifiedBefore ?? '';

      $('new-trainees').checked =
        state.newQualificationsConfirmed;

      $('sheet-skip').textContent = 'I’m not sure';
    }

    // ----------------------------------------------------------
    // MISSION IMPACT
    // ----------------------------------------------------------

    else if (type === 'impact') {
      title = 'What did it make possible?';

      subtitle =
        'One more detail can turn an activity into a meaningful, defensible performance statement.';

      html(`
        <label class="sheet-label" for="outcome-input">
          Describe the actual result
        </label>

        <textarea
          class="sheet-textarea"
          id="outcome-input"
          rows="5"
          maxlength="1200"
          placeholder="What changed for your team or mission? If you don’t know yet, that’s okay."
        ></textarea>

        <p class="help-note">
          Only describe outcomes you can personally verify.
          Don’t include sensitive deployment details.
        </p>
      `);

      $('outcome-input').value = state.outcome;
      $('sheet-skip').textContent = 'Not sure yet';
    }

    // ----------------------------------------------------------
    // ADJUST TONE OR FOCUS
    // ----------------------------------------------------------

    else if (type === 'tone') {
      title = 'What should stand out?';

      subtitle =
        'Amy will put the emphasis on the evidence you already shared.';

      html(`
        <div class="tone-choices">

          <label>
            <input type="radio" name="focus" value="clear">
            <span>
              Clear &amp; direct
              <small>Keep the wording natural</small>
            </span>
          </label>

          <label>
            <input type="radio" name="focus" value="leadership">
            <span>
              Leadership
              <small>Focus on verified responsibility</small>
            </span>
          </label>

          <label>
            <input type="radio" name="focus" value="numbers">
            <span>
              Measurable results
              <small>Highlight confirmed metrics</small>
            </span>
          </label>

          <label>
            <input type="radio" name="focus" value="mission">
            <span>
              Mission impact
              <small>Emphasize proven outcomes only</small>
            </span>
          </label>

        </div>
      `);

      body.querySelector(
        `input[value="${state.tone}"]`
      ).checked = true;

      $('sheet-skip').textContent = 'Keep current';

      $('sheet-submit').textContent = 'Apply focus →';
    }

    // ----------------------------------------------------------
    // HELP / WELCOME
    // ----------------------------------------------------------

    else if (type === 'help') {
      title = 'You’re in the right place';

      subtitle =
        'Tell me one thing you did, or choose how you’d like to begin.';

      html(`
        <div class="help-steps">

          <p>
            <strong>Improve My Bullet</strong><br>
            Start from what you’ve already written.
          </p>

          <p>
            <strong>Start From Scratch</strong><br>
            Describe a real accomplishment in everyday language.
          </p>

          <p>
            <strong>Browse Examples</strong><br>
            See how strong statements are structured.
          </p>

        </div>

        <p class="help-note">
          This preview demonstrates the interface.
          Live AI coaching will be connected to TheWing later.
        </p>
      `);

      $('sheet-skip').hidden = true;
      $('sheet-submit').textContent = 'Got it →';
    }

    // ----------------------------------------------------------
    // ADD NUMBERS
    // ----------------------------------------------------------

    else if (type === 'numbers') {
      if (training()) {
        return openSheet('training', callback);
      }

      title = 'Tell me a little more';

      subtitle =
        'Add a specific measurement or explain how you know the result.';

      html(`
        <label class="sheet-label" for="outcome-input">
          What numbers or results can you verify?
        </label>

        <textarea
          class="sheet-textarea"
          id="outcome-input"
          rows="4"
          placeholder="For example: reduced paint time from 5 days to 3 days"
        ></textarea>
      `);

      $('sheet-skip').textContent = 'Not now';
    }

    $('sheet-title').textContent = title;
    $('sheet-subtitle').textContent = subtitle;

    $('sheet-backdrop').hidden = false;

    document.body.classList.add('sheet-open');

    requestAnimationFrame(() => {
      $('sheet-backdrop').classList.add('is-open');
    });

    setTimeout(() => {
      $('bottom-sheet').focus({ preventScroll: true });
    }, 220);
  }

  // ============================================================
  // 4. SAVE ELICITATION ANSWERS
  // ============================================================

  function saveSheet() {
    const type = currentSheet;

    if (type === 'story') {
      state.story = $('story-input').value.trim();

      toast('Amy added your explanation.');
    }

    else if (
      type === 'impact' ||
      (type === 'numbers' && !training())
    ) {
      state.outcome = $('outcome-input').value.trim();

      toast('Additional context saved.');
    }

    else if (type === 'tone') {
      state.tone =
        document.querySelector(
          'input[name="focus"]:checked'
        )?.value || 'clear';

      toast('Writing focus updated.');
    }

    else if (type === 'training') {
      const totalVal = $('total-airmen').value.trim();

      const prevVal =
        $('previously-qualified').value.trim();

      const total =
        totalVal === '' ? null : safeNumber(totalVal);

      const prev =
        prevVal === '' ? null : safeNumber(prevVal);

      const f = facts();

      const confirmed = $('new-trainees').checked;

      const bad =
        (!Number.isInteger(total) && total !== null) ||
        (!Number.isInteger(prev) && prev !== null) ||
        total === 0 ||
        (
          total !== null &&
          prev !== null &&
          prev > total
        ) ||
        (
          total !== null &&
          f.trained !== null &&
          f.trained > total
        ) ||
        (
          confirmed &&
          total !== null &&
          prev !== null &&
          f.trained !== null &&
          prev + f.trained > total
        );

      if (bad) {
        $('sheet-error').textContent =
          'Please check the totals. Qualified or trained Airmen cannot exceed the section size.';

        $('sheet-error').hidden = false;

        return;
      }

      state.sectionSize = total;

      state.qualifiedBefore = prev;

      state.newQualificationsConfirmed = confirmed;

      state.askedTraining = true;

      toast('Training figures saved.');
    }

    const cb = currentSheetCallback;

    currentSheetCallback = null;

    clearSheet();

    if (cb) {
      setTimeout(cb, 260);
    }

    else if (state.screen === 'refine') {
      setTimeout(renderRefinement, 260);
    }
  }

  function skipSheet() {
    if (currentSheet === 'training') {
      state.askedTraining = true;
    }

    const cb = currentSheetCallback;

    currentSheetCallback = null;

    clearSheet();

    if (cb) {
      setTimeout(cb, 260);
    }
  }

  // ============================================================
  // 5. START REFINEMENT
  // ============================================================

  function tryRefine() {
    state.draft = $('draft-input').value.trim();

    if (!state.draft) {
      $('draft-input').focus();

      toast('Tell Amy about one accomplishment first.');

      return;
    }

    if (
      training() &&
      !state.askedTraining &&
      state.sectionSize === null
    ) {
      return openSheet(
        'training',
        () => showScreen('refine')
      );
    }

    showScreen('refine');
  }

  // ============================================================
  // 6. BUILD A FACT-BASED STATEMENT
  // ============================================================

  function statement() {
    const f = facts();

    const who = 'Airmen';

    if (training() && f.trained !== null) {
      const what =
        /5[\s-]?level/i.test(source())
          ? '5-level tasks'
          : 'the required tasks';

      const hours =
        f.hours !== null
          ? `Delivered ${fmt(f.hours)} hours of hands-on training to ${f.trained} ${who} on ${what}`
          : `Trained ${f.trained} ${who} on ${what}`;

      if (state.shortened) {
        return `${
          f.certified
            ? `Certified ${f.trained} Airmen after training on ${what}`
            : `Trained ${f.trained} Airmen on ${what}`
        }.`;
      }

      const leading =
        state.alternative % 2 === 1 &&
        f.hours === null
          ? `Developed ${f.trained} Airmen through ${what} training`
          : hours;

      const final = f.certified
        ? '; all earned certification.'
        : '.';

      const result =
        state.sectionSize !== null
          ? ` Training reached ${fmt(
              percent(f.trained, state.sectionSize)
            )}% of the ${state.sectionSize}-person section.`
          : '';

      const beforeAfter =
        state.newQualificationsConfirmed &&
        state.qualifiedBefore !== null &&
        f.certified
          ? ` Qualified coverage increased from ${state.qualifiedBefore} to ${
              state.qualifiedBefore + f.trained
            } Airmen.`
          : '';

      return leading + final + result + beforeAfter;
    }

    if (
      paint() &&
      f.before !== null &&
      f.after !== null &&
      f.before > 0 &&
      f.after < f.before
    ) {
      const reduction = fmt(
        (f.before - f.after) / f.before * 100
      );

      return state.shortened
        ? `Reduced aircraft paint turnaround by ${reduction}%.`
        : `Reduced aircraft paint turnaround from ${fmt(
            f.before
          )} to ${fmt(
            f.after
          )} days, cutting cycle time by ${reduction}%.`;
    }

    // Fall back to user-supplied text rather than fabricating details.
    return state.draft.replace(/\s+/g, ' ').trim();
  }

  // ============================================================
  // 7. AMY'S INSIGHT
  // ============================================================

  function coachInsight() {
    const f = facts();

    if (training()) {
      let out =
        f.trained !== null
          ? `You described training ${f.trained} Airmen${
              f.certified
                ? ' and confirming their certifications'
                : ''
            }. `
          : 'You described a training accomplishment. ';

      if (
        state.sectionSize &&
        f.trained !== null
      ) {
        out += `That represents ${fmt(
          percent(f.trained, state.sectionSize)
        )}% of your ${
          state.sectionSize
        }-person section—not necessarily a ${fmt(
          percent(f.trained, state.sectionSize)
        )}% increase in qualifications. `;
      }

      if (f.sole) {
        out +=
          'Your story also says you were the only qualified trainer. That responsibility may be more important than the count alone. ';
      }

      if (f.deployment) {
        out +=
          'You mentioned a deployment-related deadline. Verify the qualification requirement and the actual outcome before claiming deployment impact. ';
      }

      if (!state.outcome) {
        out +=
          'Next, explain what these qualifications enabled for the unit.';
      } else {
        out +=
          'You supplied a further outcome; review its wording before adding it to the final statement.';
      }

      return out;
    }

    if (
      paint() &&
      f.before !== null &&
      f.after !== null &&
      f.before > 0 &&
      f.after < f.before
    ) {
      return `You reduced turnaround time by ${fmt(
        (f.before - f.after) / f.before * 100
      )}%. That is a verified efficiency result. Amy would next ask what the time saved actually enabled—without assuming improved aircraft readiness.`;
    }

    return (
      'Your statement is the source of truth. Strong writing ' +
      'makes the action, responsibility, and real result easy ' +
      'to understand. Use “Explain the Bullet” to uncover ' +
      'the story behind it.'
    );
  }

  // ============================================================
  // 8. RENDER REFINEMENT SCREEN
  // ============================================================

  function renderRefinement() {
    const result = statement();

    $('recommended-text').textContent = result;

    $('verification-note').textContent =
      'Suggested wording from your entered facts · Review before using';

    $('amy-insight').textContent = coachInsight();

    renderChart();
  }

  function node(tag, cls, content) {
    const el = document.createElement(tag);

    if (cls) {
      el.className = cls;
    }

    if (content !== undefined) {
      el.textContent = content;
    }

    return el;
  }

  // ============================================================
  // 9. IMPACT VISUALIZATIONS
  // ============================================================

  function renderChart() {
    const c = $('impact-chart');

    c.replaceChildren();

    const f = facts();

    const section = state.sectionSize;
    const n = f.trained;

    const qualifies =
      training() &&
      section !== null &&
      section > 0 &&
      n !== null;

    const hasTime =
      paint() &&
      f.before !== null &&
      f.after !== null &&
      f.before > 0 &&
      f.after >= 0;

    $('impact-card').hidden = !(qualifies || hasTime);

    // ----------------------------------------------------------
    // TRAINING VISUALIZATION
    // ----------------------------------------------------------

    if (qualifies) {
      const p = percent(n, section);

      const wrap = node('div', 'training-metric');

      const circle = node('div', 'donut');

      circle.style.setProperty(
        '--portion',
        Math.min(100, p) + '%'
      );

      const middle = node('div', 'donut-center');

      middle.append(
        node('strong', '', `${fmt(p)}%`),
        node('span', '', 'of section')
      );

      circle.append(middle);

      const blurb = node('div', 'metric-blurb');

      blurb.append(
        node('strong', '', `${n} of ${section}`),
        node('span', '', 'Airmen trained')
      );

      wrap.append(circle, blurb);

      c.append(wrap);

      // Previously qualified vs. newly qualified.
      // Only display this comparison after user confirmation.

      if (
        state.qualifiedBefore !== null &&
        state.newQualificationsConfirmed &&
        f.certified
      ) {
        const before = state.qualifiedBefore;
        const after = before + n;

        const comp = node(
          'div',
          'coverage-comparison'
        );

        comp.append(
          node(
            'p',
            'metric-caption',
            'QUALIFIED COVERAGE'
          )
        );

        [
          ['Before', before],
          ['After', after]
        ].forEach(([label, val]) => {
          const line = node('div', 'coverage-line');

          const lab = node(
            'span',
            'coverage-label',
            label
          );

          const track = node(
            'div',
            'coverage-track'
          );

          const fill = node(
            'div',
            'coverage-fill'
          );

          fill.style.width =
            `${Math.min(100, percent(val, section))}%`;

          track.append(fill);

          line.append(
            lab,
            track,
            node(
              'strong',
              '',
              `${val} / ${section}`
            )
          );

          comp.append(line);
        });

        comp.append(
          node(
            'p',
            'chart-footnote',
            `An increase of ${fmt(
              percent(n, section)
            )} percentage points, assuming these ${n} were newly qualified and not previously counted.`
          )
        );

        c.append(comp);
      }
    }

    // ----------------------------------------------------------
    // AIRCRAFT PAINT TIMELINE VISUALIZATION
    // ----------------------------------------------------------

    if (hasTime) {
      const p =
        f.after < f.before
          ? (f.before - f.after) / f.before * 100
          : 0;

      const heading = node(
        'div',
        'time-metric'
      );

      heading.append(
        node('strong', '', `${fmt(p)}%`),
        node('span', '', 'less turnaround time')
      );

      c.append(heading);

      const chart = node('div', 'time-bars');

      [
        ['Before', f.before],
        ['After', f.after]
      ].forEach(([label, value]) => {
        const g = node('div', 'time-group');

        g.append(
          node(
            'strong',
            '',
            `${fmt(value)} days`
          )
        );

        const b = node('div', 'time-track');
        const fill = node('div', 'time-fill');

        fill.style.height =
          `${Math.max(
            value ? 8 : 0,
            Math.min(
              100,
              100 * value / f.before
            )
          )}%`;

        b.append(fill);

        g.append(
          b,
          node('span', '', label)
        );

        chart.append(g);
      });

      c.append(chart);

      c.append(
        node(
          'p',
          'chart-footnote',
          'Time saved does not automatically establish aircraft availability or readiness outcomes.'
        )
      );
    }
  }

  // ============================================================
  // 10. COPY RECOMMENDED STATEMENT
  // ============================================================

  async function copyStatement() {
    try {
      await navigator.clipboard.writeText(
        $('recommended-text').textContent
      );

      toast('Statement copied.');
    } catch {
      toast('Select the statement text to copy.');
    }
  }

  // ============================================================
  // 11. REFINEMENT ACTIONS
  // ============================================================

  function refinementAction(action) {
    if (action === 'use') {
      return copyStatement();
    }

    if (action === 'shorter') {
      state.shortened = !state.shortened;

      renderRefinement();

      toast(
        state.shortened
          ? 'Showing a shorter version.'
          : 'Showing the full version.'
      );

      return;
    }

    if (action === 'another') {
      state.alternative++;

      state.shortened = false;

      renderRefinement();

      toast(
        'Alternative phrasing, using the same facts.'
      );

      return;
    }

    if (action === 'story') {
      return openSheet('story');
    }

    if (action === 'tone') {
      return openSheet('tone');
    }

    if (action === 'impact') {
      return openSheet('impact');
    }

    if (action === 'numbers') {
      return openSheet('numbers');
    }
  }

  // ============================================================
  // 12. LEARNING WORKSHOP
  // ============================================================

  function setLesson(i) {
    const lesson = lessons[i];

    $('lesson-count').textContent =
      `LESSON ${i + 1} OF 3`;

    $('lesson-heading').textContent =
      lesson.heading;

    $('lesson-body').textContent =
      lesson.body;

    $('lesson-example').textContent =
      lesson.example;

    $('lesson-question').textContent =
      lesson.question;

    document
      .querySelectorAll('[data-lesson]')
      .forEach(b => {
        const active =
          Number(b.dataset.lesson) === i;

        b.classList.toggle(
          'is-active',
          active
        );

        b.setAttribute(
          'aria-selected',
          String(active)
        );
      });

    $('workshop-next').textContent =
      i === 2
        ? 'Back to my bullet ←'
        : 'Next lesson →';

    $('workshop-next').dataset.next =
      String(i === 2 ? -1 : i + 1);
  }

  // ============================================================
  // 13. STARTING OPTIONS
  // ============================================================

  document
    .querySelectorAll('[data-start]')
    .forEach(el => {
      el.addEventListener('click', () => {
        begin(el.dataset.start);
      });
    });

  document
    .querySelectorAll('[data-back]')
    .forEach(el => {
      el.addEventListener('click', () => {
        goBack(el.dataset.back);
      });
    });

  // ============================================================
  // 14. CURRENT BULLET INPUT
  // ============================================================

  $('draft-input').addEventListener(
    'input',
    () => {
      $('draft-count').textContent =
        `${$('draft-input').value.length} / 500`;

      state.draft = $('draft-input').value;
    }
  );

  // ============================================================
  // 15. EDITOR ACTIONS
  // ============================================================

  $('explain-button').addEventListener(
    'click',
    () => openSheet('story')
  );

  $('tone-button').addEventListener(
    'click',
    () => openSheet('tone')
  );

  $('workshop-button').addEventListener(
    'click',
    () => {
      showScreen('workshop');
      setLesson(0);
    }
  );

  $('about-button').addEventListener(
    'click',
    () => openSheet('help')
  );

  $('refine-button').addEventListener(
    'click',
    tryRefine
  );

  $('copy-button').addEventListener(
    'click',
    copyStatement
  );

  $('edit-metrics').addEventListener(
    'click',
    () => openSheet(
      training() ? 'training' : 'numbers'
    )
  );

  // ============================================================
  // 16. REFINEMENT SCREEN BUTTONS
  // ============================================================

  document
    .querySelectorAll('[data-refine-action]')
    .forEach(el => {
      el.addEventListener('click', () => {
        refinementAction(
          el.dataset.refineAction
        );
      });
    });

  // ============================================================
  // 17. BOTTOM CHAT INPUT
  // ============================================================

  $('composer-form').addEventListener(
    'submit',
    (e) => {
      e.preventDefault();

      const v =
        $('composer-input').value.trim();

      if (!v) return;

      $('composer-input').value = '';

      if (state.screen === 'home') {
        if (
          /\b(how|help|what|where|start|work|explain|question|hello|hi)\b/i.test(v) &&
          v.length < 110
        ) {
          return openSheet('help');
        }

        state.draft = v;

        $('draft-input').value = v;

        $('draft-count').textContent =
          `${v.length} / 500`;

        return begin('improve');
      }

      if (state.screen === 'refine') {
        state.outcome = [
          state.outcome,
          v
        ].filter(Boolean).join('\n');

        renderRefinement();

        toast(
          'Added to your notes. Amy will need to verify this before including it in the statement.'
        );
      }
    }
  );

  // ============================================================
  // 18. ELICITATION EVENTS
  // ============================================================

  $('sheet-close').addEventListener(
    'click',
    clearSheet
  );

  $('sheet-backdrop').addEventListener(
    'click',
    e => {
      if (
        e.target === $('sheet-backdrop')
      ) {
        clearSheet();
      }
    }
  );

  $('sheet-form').addEventListener(
    'submit',
    e => {
      e.preventDefault();
      saveSheet();
    }
  );

  $('sheet-skip').addEventListener(
    'click',
    skipSheet
  );

  // ============================================================
  // 19. KEYBOARD / ACCESSIBILITY
  // ============================================================

  document.addEventListener(
    'keydown',
    e => {
      if (
        e.key === 'Escape' &&
        !$('sheet-backdrop').hidden
      ) {
        clearSheet();
      }

      if (
        e.key === 'Tab' &&
        !$('sheet-backdrop').hidden
      ) {
        const els = [
          ...$('bottom-sheet')
            .querySelectorAll(
              'button:not([hidden]), input:not([disabled]), textarea:not([disabled])'
            )
        ].filter(x => x.getClientRects().length);

        if (!els.length) return;

        const first = els[0];
        const last = els[els.length - 1];

        if (
          e.shiftKey &&
          document.activeElement === first
        ) {
          e.preventDefault();
          last.focus();
        }

        else if (
          !e.shiftKey &&
          document.activeElement === last
        ) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  );

  // ============================================================
  // 20. SPECIALIZED EXAMPLES
  // ============================================================

  document
    .querySelectorAll('[data-example]')
    .forEach(el => {
      el.addEventListener(
        'click',
        () => {
          const x =
            examples[el.dataset.example];

          const d = $('example-detail');

          d.replaceChildren(
            node('h3', '', x[0]),
            node('p', '', x[1]),
            node(
              'p',
              'example-question',
              `Amy might ask: “${x[2]}”`
            )
          );
        }
      );
    });

  $('example-start').addEventListener(
    'click',
    () => begin('scratch')
  );

  // ============================================================
  // 21. WORKSHOP EVENTS
  // ============================================================

  document
    .querySelectorAll('[data-lesson]')
    .forEach(el => {
      el.addEventListener(
        'click',
        () => {
          setLesson(
            Number(el.dataset.lesson)
          );
        }
      );
    });

  $('workshop-next').addEventListener(
    'click',
    () => {
      const next = Number(
        $('workshop-next').dataset.next
      );

      if (next < 0) {
        showScreen('editor');
      } else {
        setLesson(next);
      }
    }
  );

  // ============================================================
  // 22. INITIALIZE APP
  // ============================================================

  showScreen('home');

})();
