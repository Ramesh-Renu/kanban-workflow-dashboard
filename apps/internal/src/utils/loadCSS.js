// src/utils/loadCSS.js
export function loadCSS(href) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`link[href="${href}"]`)) {
        resolve();
        return;
      }
      
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
  
      link.onload = () => resolve();
      link.onerror = (error) => reject(error);
  
      document.head.appendChild(link);
    });
  }
  
  export function unloadCSS(href) {
    const link = document.querySelector(`link[href="${href}"]`);
    if (link) {
      document.head.removeChild(link);
    }
  }
  
