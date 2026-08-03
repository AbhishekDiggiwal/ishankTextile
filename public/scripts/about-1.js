  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('button').forEach((button) => {
      const label = button.textContent.trim().toLowerCase();
      if (label.includes('quote') || label.includes('contact')) {
        button.addEventListener('click', () => { SecurityUtils.navigate('contact.html'); });
      }
      if (label.includes('catalogue') || label.includes('catalog') || label.includes('collection') || label.includes('spec')) {
        button.addEventListener('click', () => { SecurityUtils.navigate('products-catalogue.html'); });
      }
      if (label.includes('engineering')) {
        button.addEventListener('click', () => { SecurityUtils.navigate('contact.html'); });
      }
    });
  });
