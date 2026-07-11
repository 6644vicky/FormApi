(function() {
  // Create container for widget
  const container = document.createElement('div');
  container.id = 'form-widget-container';

  const buttonHTML = `
    <style>
      #form-widget-btn {
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: #272727;
        color: white;
        padding: 14px 24px;
        border-radius: 50px;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        font-size: 14px;
        font-weight: 500;
        border: none;
        z-index: 9999;
        transition: all 0.3s ease;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      #form-widget-btn:hover {
        background: #1a1a1a;
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
      }

      #form-widget-overlay {
        display: none;
        position: fixed;
        bottom: 0;
        right: 0;
        top: 0;
        left: 0;
        background: rgba(0, 0, 0, 0.4);
        z-index: 9998;
        animation: fadeIn 0.3s ease;
      }

      #form-widget-modal {
        display: none;
        position: fixed;
        bottom: 24px;
        right: 24px;
        width: 420px;
        max-width: 90vw;
        height: 600px;
        max-height: 80vh;
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        z-index: 9999;
        animation: slideUp 0.3s ease;
        background: white;
      }

      #form-widget-modal iframe {
        width: 100%;
        height: 100%;
        border: none;
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @media (max-width: 640px) {
        #form-widget-modal {
          bottom: 0;
          right: 0;
          left: 0;
          top: 0;
          width: 100%;
          height: 100%;
          max-width: 100%;
          max-height: 100%;
          border-radius: 0;
        }
      }
    </style>

    <button id="form-widget-btn">💬 Chat with us</button>
    <div id="form-widget-overlay"></div>
    <div id="form-widget-modal">
      <iframe src="https://form-api-zeta.vercel.app/form"></iframe>
    </div>
  `;

  container.innerHTML = buttonHTML;
  document.body.appendChild(container);

  // Get elements
  const btn = document.getElementById('form-widget-btn');
  const overlay = document.getElementById('form-widget-overlay');
  const modal = document.getElementById('form-widget-modal');

  // Toggle modal
  function toggleModal() {
    const isHidden = modal.style.display === 'none';
    modal.style.display = isHidden ? 'block' : 'none';
    overlay.style.display = isHidden ? 'block' : 'none';
  }

  // Event listeners
  btn.addEventListener('click', toggleModal);
  overlay.addEventListener('click', toggleModal);

  // Close on escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.style.display === 'block') {
      toggleModal();
    }
  });
})();
