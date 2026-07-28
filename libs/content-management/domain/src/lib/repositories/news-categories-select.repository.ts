import { FetchOptions } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { NewsCategoryOption } from '../props/news-category-option.props';

/**
 * Lecture seule — alimente le select catégorie (+ sous-catégories en cascade)
 * du formulaire `news`. Pas de CRUD catégories dans ce module (aucun écran
 * dans le source), même précédent que `TeamsSelectRepository`.
 */
export abstract class NewsCategoriesSelectRepository {
    abstract execute(options?: FetchOptions): Observable<NewsCategoryOption[]>;
}
