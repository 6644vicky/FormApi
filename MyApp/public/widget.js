(function() {
  // Styles for the button and iframe
  const style = document.createElement('style');
  style.innerHTML = `
    #form-widget-btn {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 9999;
      background: #000;
      color: #fff;
      padding: 15px 25px;
      border-radius: 30px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      font-weight: 500;
      border: none;
      font-size: 14px;
      transition: all 0.3s ease;
    }
    #form-widget-btn:hover {
      background: #333;
      box-shadow: 0 6px 16px rgba(0,0,0,0.3);
    }
    #form-widget-iframe {
      display: none;
      position: fixed;
      bottom: 80px;
      right: 20px;
      z-index: 9999;
      width: 400px;
      height: 500px;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 25px rgba(0,0,0,0.3);
      border: none;
      animation: slideUp 0.3s ease;
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
  `;
  document.head.appendChild(style);

  // Creating elements
  const btn = document.createElement('div');
  btn.id = 'form-widget-btn';
  btn.innerText = 'Contact Us';

  const iframe = document.createElement('iframe');
  iframe.id = 'form-widget-iframe';

  // Set iframe src dynamically based on current origin
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    iframe.src = origin.includes('localhost') ?
      origin + '/form' :
      'https://form-api-zeta.vercel.app/form';
  }

  document.body.appendChild(btn);
  document.body.appendChild(iframe);

  // Toggle logic
  btn.onclick = () => {
    iframe.style.display = iframe.style.display === 'block' ? 'none' : 'block';
  };

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && iframe.style.display === 'block') {
      iframe.style.display = 'none';
    }
  });
})();
