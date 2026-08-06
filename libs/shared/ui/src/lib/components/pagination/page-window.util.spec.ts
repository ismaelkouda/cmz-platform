import { pageWindow } from './page-window.util';

describe('pageWindow', () => {
    it('affiche toutes les pages sans ellipse si le nombre total de pages est petit', () => {
        expect(pageWindow(1, 3)).toEqual([1, 2, 3]);
        expect(pageWindow(3, 5)).toEqual([1, 2, 3, 4, 5]);
    });

    it('ajoute une ellipse à droite si la page courante est proche du début', () => {
        expect(pageWindow(1, 10)).toEqual([1, 2, 'ellipsis', 10]);
        expect(pageWindow(2, 10)).toEqual([1, 2, 3, 'ellipsis', 10]);
    });

    it('ajoute une ellipse à gauche si la page courante est proche de la fin', () => {
        expect(pageWindow(10, 10)).toEqual([1, 'ellipsis', 9, 10]);
        expect(pageWindow(9, 10)).toEqual([1, 'ellipsis', 8, 9, 10]);
    });

    it('ajoute deux ellipses si la page courante est au milieu', () => {
        expect(pageWindow(5, 10)).toEqual([
            1,
            'ellipsis',
            4,
            5,
            6,
            'ellipsis',
            10,
        ]);
    });

    it('borne la page courante entre 1 et last', () => {
        expect(pageWindow(-5, 10)).toEqual([1, 2, 'ellipsis', 10]);
        expect(pageWindow(100, 10)).toEqual([1, 'ellipsis', 9, 10]);
    });
});
