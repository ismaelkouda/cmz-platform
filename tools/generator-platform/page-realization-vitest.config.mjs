// L'oracle s'exécute sans accès réseau externe. Vitest a néanmoins besoin
// d'une socket locale pour son serveur interne ; une adresse numérique évite
// toute résolution DNS et borne explicitement cette exception au loopback.
export default {
    server: {
        host: '127.0.0.1',
    },
};
