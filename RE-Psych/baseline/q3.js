
(function () {
  document.querySelectorAll('[data-pcsu-q3]').forEach(function (root) {
    if (root.dataset.ready === 'true') return;
    root.dataset.ready = 'true';

    const items = [
      { id: 'travel', label: 'Travel time' },
      { id: 'payment', label: 'Monthly payment' },
      { id: 'space', label: 'Usable home space' },
      { id: 'condition', label: 'Home condition' }
    ];

    const list = root.querySelector('.pcsu-q3-list');
    const confirm = root.querySelector('.pcsu-q3-confirm');
    const result = root.querySelector('.pcsu-q3-result');
    const live = root.querySelector('.pcsu-q3-live');
    const rows = new Map();

    let order = items.map(function (item) {
      return item.id;
    });

    let drag = null;

    // No answer exists until the user explicitly confirms.
    root.q3Answer = null;

    function ranking() {
      return order.map(function (id, index) {
        return {
          id: id,
          label: items.find(function (item) {
            return item.id === id;
          }).label,
          rank: index + 1
        };
      });
    }

    function update() {
      order.forEach(function (id, index) {
        const row = rows.get(id);

        list.appendChild(row);

        row.querySelector('.pcsu-q3-number').textContent =
          index + 1;

        row.querySelector('[data-move="-1"]').disabled =
          index === 0;

        row.querySelector('[data-move="1"]').disabled =
          index === order.length - 1;
      });
    }

    function move(id, target) {
      const from = order.indexOf(id);

      target = Math.max(
        0,
        Math.min(order.length - 1, target)
      );

      if (from === target) return;

      const focused = document.activeElement;

      const before = new Map(
        order.map(function (key) {
          return [
            key,
            rows.get(key).getBoundingClientRect().top
          ];
        })
      );

      order.splice(from, 1);
      order.splice(target, 0, id);

      update();

      if (
        !window.matchMedia(
          '(prefers-reduced-motion: reduce)'
        ).matches
      ) {
        order.forEach(function (key) {
          const row = rows.get(key);

          if (drag && drag.id === key) return;

          const dy =
            before.get(key) -
            row.getBoundingClientRect().top;

          if (dy && row.animate) {
            row.animate(
              [
                { transform: 'translateY(' + dy + 'px)' },
                { transform: 'translateY(0)' }
              ],
              {
                duration: 160,
                easing: 'ease-out'
              }
            );
          }
        });
      }

      if (
        !drag &&
        focused &&
        root.contains(focused)
      ) {
        const focusTarget = focused.disabled
          ? rows.get(id).querySelector('.pcsu-q3-handle')
          : focused;

        focusTarget.focus({ preventScroll: true });
      }

      // Editing invalidates the previous confirmation.
      root.q3Answer = null;
      root.dataset.confirmed = 'false';

      confirm.disabled = false;
      confirm.innerHTML =
        'Confirm my order <span aria-hidden="true">→</span>';

      result.textContent = '';

      live.textContent =
        rows.get(id).querySelector('.pcsu-q3-label').textContent +
        ' moved to position ' +
        (target + 1) +
        ' of 4.';

      root.dispatchEvent(
        new CustomEvent('repsych:q3:change', {
          bubbles: true,
          detail: {
            questionId: 'q3',
            confirmed: false,
            ranking: ranking()
          }
        })
      );
    }

    function finishDrag() {
      if (!drag) return;

      rows.get(drag.id).classList.remove('is-dragging');
      drag = null;

      document.removeEventListener('pointermove', onDrag);
      document.removeEventListener('pointerup', finishDrag);
      document.removeEventListener('pointercancel', finishDrag);
      window.removeEventListener('blur', finishDrag);
    }

    function onDrag(event) {
      if (!drag || event.pointerId !== drag.pointerId) return;

      if (
        Math.abs(event.clientY - drag.startY) < 5 &&
        !drag.started
      ) {
        return;
      }

      drag.started = true;

      if (event.cancelable) event.preventDefault();

      const remaining = order.filter(function (id) {
        return id !== drag.id;
      });

      const target = remaining.filter(function (id) {
        const box = rows.get(id).getBoundingClientRect();
        return event.clientY > box.top + box.height / 2;
      }).length;

      move(drag.id, target);
    }

    items.forEach(function (item) {
      const row = document.createElement('li');

      row.className = 'pcsu-q3-row';
      row.dataset.priority = item.id;

      row.innerHTML =
        '<span class="pcsu-q3-number" aria-hidden="true"></span>' +
        '<button class="pcsu-q3-handle" type="button">' +
          '<span aria-hidden="true">⠿</span>' +
        '</button>' +
        '<span class="pcsu-q3-label"></span>' +
        '<span class="pcsu-q3-arrows">' +
          '<button class="pcsu-q3-arrow" data-move="-1" type="button">' +
            '<span aria-hidden="true">↑</span>' +
          '</button>' +
          '<button class="pcsu-q3-arrow" data-move="1" type="button">' +
            '<span aria-hidden="true">↓</span>' +
          '</button>' +
        '</span>';

      row.querySelector('.pcsu-q3-label').textContent =
        item.label;

      const handle = row.querySelector('.pcsu-q3-handle');

      handle.setAttribute(
        'aria-label',
        'Reorder ' + item.label +
        '. Drag, or use the up and down arrow keys.'
      );

      handle.addEventListener('pointerdown', function (event) {
        if (!event.isPrimary || event.button !== 0) return;

        finishDrag();
        handle.focus({ preventScroll: true });

        drag = {
          id: item.id,
          pointerId: event.pointerId,
          startY: event.clientY,
          started: false
        };

        row.classList.add('is-dragging');

        document.addEventListener(
          'pointermove',
          onDrag,
          { passive: false }
        );

        document.addEventListener('pointerup', finishDrag);
        document.addEventListener('pointercancel', finishDrag);
        window.addEventListener('blur', finishDrag);
      });

      handle.addEventListener('keydown', function (event) {
        if (
          event.key !== 'ArrowUp' &&
          event.key !== 'ArrowDown'
        ) {
          return;
        }

        event.preventDefault();

        move(
          item.id,
          order.indexOf(item.id) +
          (event.key === 'ArrowUp' ? -1 : 1)
        );
      });

      row.querySelectorAll('[data-move]').forEach(function (button) {
        const direction = Number(button.dataset.move);

        button.setAttribute(
          'aria-label',
          'Move ' + item.label +
          (direction < 0 ? ' up' : ' down')
        );

        button.addEventListener('click', function () {
          move(
            item.id,
            order.indexOf(item.id) + direction
          );
        });
      });

      rows.set(item.id, row);
    });

    confirm.addEventListener('click', function () {
      finishDrag();

      const answer = {
        version: 'repsych.q3.v1',
        questionId: 'q3',
        confirmed: true,
        ranking: ranking()
      };

      root.q3Answer = answer;
      root.dataset.confirmed = 'true';

      result.textContent =
        answer.ranking[0].label +
        ' comes first. Adjust any card to change your order.';

      confirm.textContent = 'Order confirmed ✓';
      confirm.disabled = true;

      // Future RE-Psych integration can listen for this event.
      root.dispatchEvent(
        new CustomEvent('repsych:q3:confirmed', {
          bubbles: true,
          detail: {
            ...answer,
            ranking: ranking()
          }
        })
      );
    });

    update();
  });
})();
