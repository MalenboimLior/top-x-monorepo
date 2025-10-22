interface AdsWindow extends Window {
  adsbygoogle?: unknown[];
}

let scriptAppended = false;

export const loadAdSenseScript = (clientId?: string) => {
  if (typeof document === 'undefined' || !clientId) {
    return;
  }

  if (scriptAppended || document.querySelector('script[data-google-adsbygoogle="true"]')) {
    scriptAppended = true;
    return;
  }

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(clientId)}`;
  script.crossOrigin = 'anonymous';
  script.setAttribute('data-google-adsbygoogle', 'true');
  script.onload = () => {
    scriptAppended = true;
  };
  script.onerror = (error) => {
    console.error('Failed to load Google AdSense script', error);
  };

  document.head.appendChild(script);
};

export const pushAdSenseSlot = () => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const adsWindow = window as AdsWindow;
    (adsWindow.adsbygoogle = adsWindow.adsbygoogle || []).push({});
  } catch (error) {
    console.error('Failed to push Google AdSense slot', error);
  }
};
