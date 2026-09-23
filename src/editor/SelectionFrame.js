// Cadre contextuel affiché autour de la tuile sélectionnée dans l'éditeur :
// bouton "✖" (supprimer) en haut à gauche, "⟲" (pivoter) en haut à droite.
// En DOM plutôt qu'en objets Phaser dans le canvas — plus simple et plus fiable
// pour garantir que les clics sur les boutons ne soient jamais aussi interprétés
// comme un clic sur la carte (deux systèmes d'input séparés, pas de risque de
// conflit de propagation d'événements entre eux). Le cadre lui-même ignore les
// clics (pointer-events: none) pour laisser passer le glisser-déposer vers le
// canvas Phaser en dessous.

export class SelectionFrame {
  constructor({ onDelete, onRotate }) {
    this.onDelete = onDelete;
    this.onRotate = onRotate;

    this._injectStyles();
    this._buildDom();
  }

  _injectStyles() {
    if (document.getElementById('ne-selection-styles')) return;

    const style = document.createElement('style');
    style.id = 'ne-selection-styles';
    style.textContent = `
      .ne-selection-frame {
        position: fixed; z-index: 999; pointer-events: none;
        border: 2px dashed #c79a3b; border-radius: 4px;
      }
      .ne-selection-frame[hidden] { display: none; }
      .ne-selection-btn {
        position: absolute; width: 24px; height: 24px; border-radius: 50%;
        border: 2px solid #1b1712; cursor: pointer; font-size: 13px; line-height: 20px;
        padding: 0; pointer-events: auto; font-weight: bold;
      }
      .ne-selection-delete { top: -12px; left: -12px; background: #a23b2a; color: #f1e9d2; }
      .ne-selection-rotate { top: -12px; right: -12px; background: #1f5e52; color: #f1e9d2; }
    `;
    document.head.appendChild(style);
  }

  _buildDom() {
    this.el = document.createElement('div');
    this.el.className = 'ne-selection-frame';
    this.el.hidden = true;

    this.deleteBtn = document.createElement('button');
    this.deleteBtn.type = 'button';
    this.deleteBtn.className = 'ne-selection-btn ne-selection-delete';
    this.deleteBtn.textContent = '✖';
    this.deleteBtn.title = 'Supprimer (Suppr)';
    this.deleteBtn.addEventListener('click', () => this.onDelete());

    this.rotateBtn = document.createElement('button');
    this.rotateBtn.type = 'button';
    this.rotateBtn.className = 'ne-selection-btn ne-selection-rotate';
    this.rotateBtn.textContent = '⟲';
    this.rotateBtn.title = 'Pivoter (R)';
    this.rotateBtn.addEventListener('click', () => this.onRotate());

    this.el.appendChild(this.deleteBtn);
    this.el.appendChild(this.rotateBtn);
    document.body.appendChild(this.el);
  }

  /** Positionne le cadre en pixels écran (déjà convertis depuis le monde par
   * l'appelant — voir MapScene.update()), centré sur (x, y), carré de `size`. */
  setScreenRect(x, y, size) {
    this.el.hidden = false;
    this.el.style.left = `${x - size / 2}px`;
    this.el.style.top = `${y - size / 2}px`;
    this.el.style.width = `${size}px`;
    this.el.style.height = `${size}px`;
  }

  hide() {
    this.el.hidden = true;
  }

  destroy() {
    this.el.remove();
  }
}
