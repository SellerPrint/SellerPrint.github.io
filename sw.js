/**
 * SellerPrint — service worker de nettoyage.
 *
 * L'ancienne version de ce fichier importait un service worker tiers
 * (3nbf4.com, réseau push-ads) qui interceptait TOUTES les pages du site
 * et y injectait des murs "ad-blocker détecté" et des popups de
 * notification — y compris sur boost.html, qui n'a pourtant aucun lien
 * vers ce réseau dans son propre code.
 *
 * Ce remplacement se désinstalle automatiquement chez les visiteurs qui
 * avaient déjà l'ancien service worker en cache, pour nettoyer leur
 * navigateur dès leur prochaine visite.
 */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    self.registration.unregister().then(() => {
      return self.clients.matchAll({ type: 'window' });
    }).then((clients) => {
      clients.forEach((client) => client.navigate(client.url));
    })
  );
});
