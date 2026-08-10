/** Fragment i18n FR — SETTINGS_SECURITY, COMMUNICATION, DASHBOARD, MONITORING, REPORTING, INTERACTIVE_MAP, REPORT_STATES (plafond 800 l.). */
export const FR_PACK_4 = {
    SETTINGS_SECURITY: {
        USERS: {
            TITLE: 'Utilisateurs',
            FORM: {
                TITLE: {
                    CREATE: 'Nouvel utilisateur',
                    EDIT: "Modifier l'utilisateur",
                    DETAILS: "Détails de l'utilisateur",
                },
                FIRST_NAME: 'Prénom',
                LAST_NAME: 'Nom',
                EMAIL: 'Email',
                PHONE: 'Téléphone',
                PROFILE: 'Profil',
                ROLE: 'Rôle',
                ERROR: {
                    CREATE: {
                        EMAIL_REQUIRE: "L'email est requis",
                        FIRST_NAME_REQUIRE: 'Le prénom est requis',
                        LAST_NAME_REQUIRE: 'Le nom est requis',
                        PHONE_REQUIRE: 'Le téléphone est requis',
                        PROFILE_REQUIRE: 'Le profil est requis',
                    },
                    UPDATE: {
                        EMAIL_REQUIRE: "L'email est requis",
                        FIRST_NAME_REQUIRE: 'Le prénom est requis',
                        LAST_NAME_REQUIRE: 'Le nom est requis',
                        PHONE_REQUIRE: 'Le téléphone est requis',
                        PROFILE_REQUIRE: 'Le profil est requis',
                        UNIQ_ID_REQUIRE: "L'identifiant est requis",
                    },
                },
            },
            FILTER: {
                SEARCH: 'Recherche',
                SEARCH_PLACEHOLDER: 'Rechercher…',
                PROFILE: 'Profil',
                PROFILE_PLACEHOLDER: 'Filtrer par profil…',
                ROLE: 'Rôle',
                STATUS: 'Statut',
            },
            TABLE: {
                FIRST_NAME: 'Prénom',
                LAST_NAME: 'Nom',
                EMAIL: 'Email',
                PHONE: 'Téléphone',
                ROLE: 'Rôle',
                PROFILE: 'Profil',
                STATUS: 'Statut',
                UPDATED_AT: 'Modifié le',
                ACTION: 'Actions',
            },
            TOOLTIP: {
                CREATE: 'Créer un utilisateur',
                EDIT: 'Modifier',
                DELETE: 'Supprimer',
                ENABLE: 'Activer',
                DISABLE: 'Désactiver',
                CHOOSE: 'Actions',
                NO_PERMISSION_CREATE: 'Permission manquante pour créer',
                NO_PERMISSION_EDIT: 'Permission manquante pour modifier',
                NO_PERMISSION_DELETE: 'Permission manquante pour supprimer',
                NO_PERMISSION_ACTIVE: 'Permission manquante pour activer',
                NO_PERMISSION_DISABLE: 'Permission manquante pour désactiver',
                NO_PERMISSION_CHOOSE: 'Aucune action disponible',
            },
            SWEET_ALERT: {
                TITLE: {
                    DELETE: 'Supprimer',
                    ENABLE: 'Activer',
                    DISABLE: 'Désactiver',
                },
                MESSAGE: {
                    DELETE: 'Supprimer « {{uniqId}} » ?',
                    ENABLE: 'Activer « {{uniqId}} » ?',
                    DISABLE: 'Désactiver « {{uniqId}} » ?',
                },
            },
            ERROR: {
                DELETE: {
                    UNIQ_ID_REQUIRE: "L'identifiant est requis",
                },
                DISABLE: {
                    UNIQ_ID_REQUIRE: "L'identifiant est requis",
                },
                ENABLE: {
                    UNIQ_ID_REQUIRE: "L'identifiant est requis",
                },
                FIND_ONE: {
                    UNIQ_ID_REQUIRE: "L'identifiant est requis",
                },
            },
        },
        PROFILES_PERMISSIONS: {
            TITLE: 'Profils & permissions',
            FORM: {
                TITLE: {
                    CREATE: 'Nouveau profil',
                    EDIT: 'Modifier le profil',
                    DETAILS: 'Détails du profil',
                },
                NAME: 'Nom',
                DESCRIPTION: 'Description',
                PERMISSIONS: 'Permissions',
                ERROR: {
                    CREATE: {
                        DESCRIPTION_REQUIRE: 'La description est requise',
                        NAME_REQUIRE: 'Le nom est requis',
                    },
                    UPDATE: {
                        DESCRIPTION_REQUIRE: 'La description est requise',
                        NAME_REQUIRE: 'Le nom est requis',
                        UNIQ_ID_REQUIRE: "L'identifiant est requis",
                    },
                },
            },
            FILTER: {
                SEARCH: 'Recherche',
                SEARCH_PLACEHOLDER: 'Rechercher…',
                STATUS: 'Statut',
            },
            TABLE: {
                NAME: 'Nom',
                DESCRIPTION: 'Description',
                USERS_COUNT: 'Utilisateurs',
                STATUS: 'Statut',
                UPDATED_AT: 'Modifié le',
                ACTION: 'Actions',
            },
            ACTION: {
                READ: 'Lecture',
                WRITE: 'Écriture',
                EXECUTE: 'Exécution',
                EXPORT: 'Export',
                DELETE: 'Suppression',
                APPROVE: 'Validation',
            },
            TOOLTIP: {
                CREATE: 'Créer un profil',
                EDIT: 'Modifier',
                DELETE: 'Supprimer',
                ENABLE: 'Activer',
                DISABLE: 'Désactiver',
                CHOOSE: 'Actions',
                NO_PERMISSION_CREATE: 'Permission manquante pour créer',
                NO_PERMISSION_EDIT: 'Permission manquante pour modifier',
                NO_PERMISSION_DELETE: 'Permission manquante pour supprimer',
                NO_PERMISSION_ACTIVE: 'Permission manquante pour activer',
                NO_PERMISSION_DISABLE: 'Permission manquante pour désactiver',
                NO_PERMISSION_CHOOSE: 'Aucune action disponible',
            },
            SWEET_ALERT: {
                TITLE: {
                    DELETE: 'Supprimer',
                    ENABLE: 'Activer',
                    DISABLE: 'Désactiver',
                },
                MESSAGE: {
                    DELETE: 'Supprimer « {{uniqId}} » ?',
                    ENABLE: 'Activer « {{uniqId}} » ?',
                    DISABLE: 'Désactiver « {{uniqId}} » ?',
                },
            },
            ERROR: {
                DELETE: {
                    UNIQ_ID_REQUIRE: "L'identifiant est requis",
                },
                DISABLE: {
                    UNIQ_ID_REQUIRE: "L'identifiant est requis",
                },
                ENABLE: {
                    UNIQ_ID_REQUIRE: "L'identifiant est requis",
                },
                FIND_ONE: {
                    UNIQ_ID_REQUIRE: "L'identifiant est requis",
                },
            },
        },
        ACCESS_LOGS: {
            TITLE: 'Journal de connexions',
            FILTER: {
                SEARCH: 'Recherche',
                SEARCH_PLACEHOLDER: 'Rechercher…',
                ACTION: 'Action',
                DATE: {
                    FROM: 'Du',
                    TO: 'Au',
                },
            },
            TABLE: {
                ACTION: 'Action',
                SOURCE: 'Source',
                USER_AGENT: 'Agent utilisateur',
                CREATED_AT: 'Date',
            },
            ACTION: {
                LOGIN: 'Connexion',
                LOGOUT: 'Déconnexion',
                ATTEMPTED_LOGIN: 'Tentative de connexion',
                BLOCKED_ATTEMPTED_LOGIN: 'Tentative bloquée',
                ATTEMPTS_EXCEEDED: 'Nombre de tentatives dépassé',
            },
        },
    },
    COMMUNICATION: {
        MESSAGING: {
            TITLE: 'Messages',
            FORM: {
                TITLE: {
                    CREATE: 'Nouveau message',
                    EDIT: 'Modifier le message',
                    DETAILS: 'Détails du message',
                },
                TYPE: 'Type',
                TARGET_TYPE: 'Cible',
                REPORT_ID: 'Signalement',
                REGION: 'Région',
                DEPARTMENT: 'Département',
                MUNICIPALITY: 'Commune',
                CHANNELS: 'Canaux',
                SUBJECT: 'Sujet',
                CONTENT: 'Contenu',
                SMS_TOO_LONG:
                    'Le contenu est trop long pour un SMS (160 caractères max).',
            },
            FILTER: {
                SEARCH: 'Recherche',
                SEARCH_PLACEHOLDER: 'Rechercher…',
                TARGET_TYPE: 'Cible',
            },
            TABLE: {
                TYPE: 'Type',
                TARGET_TYPE: 'Cible',
                CHANNELS: 'Canaux',
                SUBJECT: 'Sujet',
                CREATED_AT: 'Créé le',
                ACTION: 'Actions',
            },
            ENUMS: {
                TYPE: {
                    TIP: 'Astuce',
                    EDUCATION: 'Éducation',
                    INFO: 'Information',
                    AWARENESS: 'Sensibilisation',
                },
                TARGET: {
                    REPORT: 'Signalement',
                    AREA: 'Zone géographique',
                },
                CHANNELS: {
                    PUSH: 'Push',
                    EMAIL: 'Email',
                    SMS: 'SMS',
                },
            },
            TOOLTIP: {
                CREATE: 'Créer un message',
                VIEW: 'Voir',
                EDIT: 'Modifier',
                DELETE: 'Supprimer',
                CHOOSE: 'Actions',
                NO_PERMISSION_CREATE: 'Permission manquante pour créer',
                NO_PERMISSION_VIEW: 'Permission manquante pour voir',
                NO_PERMISSION_EDIT: 'Permission manquante pour modifier',
                NO_PERMISSION_DELETE: 'Permission manquante pour supprimer',
                NO_PERMISSION_CHOOSE: 'Aucune action disponible',
            },
            SWEET_ALERT: {
                TITLE: {
                    DELETE: 'Supprimer',
                },
                MESSAGE: {
                    DELETE: 'Supprimer « {{uniqId}} » ?',
                },
            },
            ERROR: {
                SMS_CONTENT_TOO_LONG: 'Le contenu du SMS est trop long',
            },
        },
        NOTIFICATIONS: {
            TITLE: 'Notifications',
            FILTER: {
                SEARCH: 'Recherche',
                SEARCH_PLACEHOLDER: 'Rechercher…',
                TYPE: 'Type',
                DATE: {
                    FROM: 'Du',
                    TO: 'Au',
                },
            },
            TABLE: {
                REFERENCE: 'Référence',
                TITLE: 'Titre',
                MESSAGE: 'Message',
                STATUS: 'Statut',
                SEND_AT: 'Envoyé le',
                ACTION: 'Actions',
                READ: 'Marquer comme lu',
            },
            TOOLTIP: {
                READ: 'Marquer comme lu',
                READ_ALL: 'Tout marquer comme lu',
                NOT_READ_ALL: 'Aucune notification à marquer comme lue',
                ALREADY_READ: 'Déjà lu',
                CHOOSE: 'Actions',
                NO_PERMISSION_READ:
                    'Permission manquante pour marquer comme lu',
            },
            SWEET_ALERT: {
                TITLE: {
                    READ_ALL: 'Tout marquer comme lu',
                },
                MESSAGE: {
                    READ_ALL: 'Marquer toutes les notifications comme lues ?',
                },
            },
        },
    },
    DASHBOARD: {
        TITLE: 'Tableau de bord',
        UPDATED_DATE: 'Dernière mise à jour',
        NO_DATE: 'Aucune date',
        REFRESH: 'Actualiser',
        NO_DATA: 'Aucune donnée disponible',
        FILTER: {
            PERIOD_LABEL: 'Période',
            PERIOD: {
                SEVEN_DAYS: '7 derniers jours',
                THIRTY_DAYS: '30 derniers jours',
                SIXTY_DAYS: '60 derniers jours',
                NINETY_DAYS: '90 derniers jours',
                INVALID: 'Période invalide.',
            },
        },
        SECTIONS: {
            TYPE: {
                TITLE: 'Signalements par type',
                TOTAL: {
                    LABEL: 'Total des signalements',
                },
            },
            TASK_STATUS: {
                TITLE: 'Statut de traitement',
                PENDING: {
                    LABEL: 'En attente',
                },
                IN_PROGRESS: {
                    LABEL: 'En cours de traitement',
                },
                REJECTED: {
                    LABEL: 'Rejetés',
                },
                FINALIZED: {
                    LABEL: 'Finalisés',
                },
                EVALUATED: {
                    LABEL: 'Évalués',
                },
            },
            PERFORMANCE: {
                TITLE: 'Performance',
                TREATMENT_RATE: {
                    LABEL: 'Taux de traitement',
                },
                COMPLETION_RATE: {
                    LABEL: 'Taux de complétion',
                },
                AVERAGE_TREATMENT_TIME: {
                    LABEL: 'Temps de traitement moyen',
                },
                RESPONSE_TIME: {
                    LABEL: 'Temps de réponse',
                },
            },
        },
    },
    MONITORING: {
        NODE: {
            TITLE: 'État des traitements',
            BREADCRUMB: 'État des traitements',
            LOADING_DESCRIPTION:
                'Chargement du tableau de bord Grafana des traitements…',
            ERROR_DESCRIPTION:
                'Impossible de charger le tableau de bord Grafana des traitements.',
        },
        SERVICES: {
            TITLE: 'État des services',
            BREADCRUMB: 'État des services',
            LOADING_DESCRIPTION:
                'Chargement du tableau de bord Grafana des services…',
            ERROR_DESCRIPTION:
                'Impossible de charger le tableau de bord Grafana des services.',
        },
        RESOURCES: {
            TITLE: 'Utilisation des ressources',
            BREADCRUMB: 'Utilisation des ressources',
            LOADING_DESCRIPTION:
                'Chargement du tableau de bord Grafana des ressources…',
            ERROR_DESCRIPTION:
                'Impossible de charger le tableau de bord Grafana des ressources.',
        },
        JOBS: {
            TITLE: 'Impact des jobs',
            BREADCRUMB: 'Impact des jobs',
            LOADING_DESCRIPTION:
                'Chargement du tableau de bord Grafana des jobs…',
            ERROR_DESCRIPTION:
                'Impossible de charger le tableau de bord Grafana des jobs.',
        },
    },
    REPORTING: {
        REPORT: {
            TITLE: 'Suivi des signalements',
            BREADCRUMB: 'Suivi des signalements',
            LOADING_DESCRIPTION:
                'Chargement du tableau de bord Grafana des signalements…',
            ERROR_DESCRIPTION:
                'Impossible de charger le tableau de bord Grafana des signalements.',
        },
        REQUESTS: {
            TITLE: 'Suivi des demandes',
            BREADCRUMB: 'Suivi des demandes',
            LOADING_DESCRIPTION:
                'Chargement du tableau de bord Grafana des demandes…',
            ERROR_DESCRIPTION:
                'Impossible de charger le tableau de bord Grafana des demandes.',
        },
        REPORT_BY_CHANNEL: {
            TITLE: 'Signalements par canal',
            BREADCRUMB: 'Signalements par canal',
            LOADING_DESCRIPTION:
                'Chargement du tableau de bord Grafana des signalements par canal…',
            ERROR_DESCRIPTION:
                'Impossible de charger le tableau de bord Grafana des signalements par canal.',
        },
        REPORT_BY_OPERATOR: {
            TITLE: 'Signalements par opérateur',
            BREADCRUMB: 'Signalements par opérateur',
            LOADING_DESCRIPTION:
                'Chargement du tableau de bord Grafana des signalements par opérateur…',
            ERROR_DESCRIPTION:
                'Impossible de charger le tableau de bord Grafana des signalements par opérateur.',
        },
    },
    INTERACTIVE_MAP: {
        BREADCRUMB: {
            LABEL: 'Vue Interactive',
            ROUTE: 'map',
            ICON: 'pi pi-map',
        },
        LABEL: 'Vue Interactive',
        MAP: {
            BREADCRUMB: {
                LABEL: 'Carte interactive',
                ROUTE: 'interactive',
            },
            TITLE: 'Carte interactive',
            LABEL: 'Carte interactive',
            LOADING_DESCRIPTION: 'Chargement de la carte et des signalements…',
            ERROR_DESCRIPTION:
                'Une erreur est survenue lors du chargement de la carte interactive.',
            REPORTS_ON_MAP: 'signalements affichés',
            REFRESH: 'Actualiser la carte',
        },
        DASHBOARD: {
            BREADCRUMB: {
                LABEL: 'Tableau de bord interactif',
                ROUTE: 'visualization',
            },
            TITLE: 'Tableau de bord interactif',
            LABEL: 'Tableau de bord interactif',
            LOADING_DESCRIPTION: 'Suivi des performances en cours…',
            ERROR_DESCRIPTION:
                'Une erreur est survenue lors du chargement du tableau de bord interactif.',
        },
    },
    REPORT_STATES: {
        BREADCRUMB: {
            LABEL: 'État des signalements',
            ROUTE: 'report-status',
            ICON: 'pi-list-check',
        },
        LABEL: 'Qualifications',
        REFRESH: 'Actualiser',
        NO_DATA: 'Aucun signalement.',
        APPROVE: {
            TITLE: 'Demandes recevables',
            LABEL: 'Demandes recevables',
            DESCRIPTION:
                'Liste des signalements validés et déclarés recevables.',
            LOADING_DESCRIPTION: 'Chargement des demandes recevables…',
            ERROR_DESCRIPTION: 'Impossible de charger les demandes recevables.',
            BREADCRUMB: {
                LABEL: 'Demandes recevables',
            },
            TABLE: {
                UNIQ_ID: 'Identifiant',
                REPORT_TYPE: 'Types de signalements',
                OPERATORS: 'Opérateurs',
                SOURCE: 'Canal Emission [Numéro]',
                REPORTED_AT: 'Signalé le',
                ACTION: 'Action',
            },
            FILTER: {
                INITIATOR: 'Numero initiateur',
                UNIQ_ID: 'Identifiant',
                REPORT_TYPE: 'Types de signalements',
                OPERATORS: 'Opérateur',
                SOURCE: "Canal d'émission",
            },
            TOOLTIP: {
                REFRESH: 'Rafraîchir la liste',
                EXPORT: 'Exporter la liste de {nb} signalements',
                TAKE: 'Prendre en charge',
                SEE_MORE: "Voir plus d'informations",
                NO_PERMISSION_EXPORT: 'Exportation non permise',
                NO_EXPORT: 'Aucun signalement à exporter',
                NO_PERMISSION_TAKE: 'Impossible de prendre en charge',
            },
        },
        EVALUATE: {
            TITLE: 'Signalements évalués',
            LABEL: 'Signalements évalués',
            DESCRIPTION:
                "Signalements ayant fait l'objet d'une évaluation technique ou terrain.",
            LOADING_DESCRIPTION: 'Chargement des signalements évalués…',
            ERROR_DESCRIPTION:
                'Impossible de charger les signalements évalués.',
            BREADCRUMB: {
                LABEL: 'Signalements évalués',
            },
            TABLE: {
                UNIQ_ID: 'Identifiant',
                REPORT_TYPE: 'Types de signalements',
                OPERATORS: 'Opérateurs',
                SOURCE: 'Canal Emission [Numéro]',
                REPORTED_AT: 'Signalé le',
                ACTION: 'Action',
            },
            FILTER: {
                INITIATOR: 'Numero initiateur',
                UNIQ_ID: 'Identifiant',
                REPORT_TYPE: 'Types de signalements',
                OPERATORS: 'Opérateur',
                SOURCE: "Canal d'émission",
            },
            TOOLTIP: {
                REFRESH: 'Rafraîchir la liste',
                EXPORT: 'Exporter la liste de {nb} signalements',
                FINALIZE: 'Finaliser ce signalement',
                SEE_MORE: "Voir plus d'informations",
                NO_PERMISSION_EXPORT: 'Exportation non permise',
                NO_EXPORT: 'Aucun signalement à exporter',
                NO_PERMISSION_FINALIZE: 'Impossible de finaliser',
            },
        },
        CLOSE: {
            TITLE: 'Signalements clôturés',
            LABEL: 'Signalements clôturés',
            DESCRIPTION: 'Signalements dont le traitement a été finalisé.',
            LOADING_DESCRIPTION: 'Chargement des signalements clôturés…',
            ERROR_DESCRIPTION:
                'Impossible de charger les signalements clôturés.',
            BREADCRUMB: {
                LABEL: 'Signalements clôturés',
            },
            TABLE: {
                UNIQ_ID: 'Identifiant',
                REPORT_TYPE: 'Types de signalements',
                OPERATORS: 'Opérateurs',
                SOURCE: 'Canal Emission [Numéro]',
                REPORTED_AT: 'Signalé le',
                ACTION: 'Action',
            },
            FILTER: {
                INITIATOR: 'Numero initiateur',
                UNIQ_ID: 'Identifiant',
                REPORT_TYPE: 'Types de signalements',
                OPERATORS: 'Opérateur',
                SOURCE: "Canal d'émission",
            },
            TOOLTIP: {
                REFRESH: 'Rafraîchir la liste',
                EXPORT: 'Exporter la liste de {nb} signalements',
                SEE_MORE: "Voir plus d'informations",
                NO_PERMISSION_EXPORT: 'Exportation non permise',
                NO_EXPORT: 'Aucun signalement à exporter',
            },
        },
        REJECT: {
            TITLE: 'Demandes non recevables',
            LABEL: 'Demandes non recevables',
            DESCRIPTION: 'Signalements rejetés ou déclarés non recevables.',
            LOADING_DESCRIPTION: 'Chargement des demandes non recevables…',
            ERROR_DESCRIPTION:
                'Impossible de charger les demandes non recevables.',
            BREADCRUMB: {
                LABEL: 'Demandes non recevables',
            },
            TABLE: {
                UNIQ_ID: 'Identifiant',
                REPORT_TYPE: 'Types de signalements',
                OPERATORS: 'Opérateurs',
                SOURCE: 'Canal Emission [Numéro]',
                REPORTED_AT: 'Signalé le',
                ACTION: 'Action',
            },
            FILTER: {
                INITIATOR: 'Numero initiateur',
                UNIQ_ID: 'Identifiant',
                REPORT_TYPE: 'Types de signalements',
                OPERATORS: 'Opérateur',
                SOURCE: "Canal d'émission",
            },
            TOOLTIP: {
                REFRESH: 'Rafraîchir la liste',
                EXPORT: 'Exporter la liste de {nb} signalements',
                TAKE: 'Prendre en charge',
                SEE_MORE: "Voir plus d'informations",
                NO_PERMISSION_EXPORT: 'Exportation non permise',
                NO_EXPORT: 'Aucun signalement à exporter',
                NO_PERMISSION_TAKE: 'Impossible de prendre en charge',
            },
        },
        DOWNLOAD: {
            TITLE: 'Historique des exports',
            LABEL: 'Historique des exports',
            DESCRIPTION:
                'Fichiers exportés (Shapefile, Excel) — téléchargement lorsque le statut est terminé.',
            LOADING_DESCRIPTION: 'Chargement des exports…',
            ERROR_DESCRIPTION: 'Impossible de charger les exports.',
            BREADCRUMB: {
                LABEL: 'Historique des exports',
            },
            TABLE: {
                DATE: 'Créé le',
                NAME: 'Fichier',
                TYPE: 'Format',
                SIZE: 'Taille',
                STATUS: 'Statut',
                FILTER: 'Filtres',
                ACTION: 'Action',
            },
            FILTER: {
                SEARCH: 'Recherche',
                SEARCH_PLACEHOLDER: 'Rechercher un export…',
                DATE: 'Date',
            },
            DIALOG: {
                TABLE: {
                    NAME: 'Filtre',
                    VALUE: 'Valeur',
                },
            },
            TOOLTIP: {
                REFRESH: 'Rafraîchir la liste',
                EXPORT: 'Exporter la liste de {nb} fichiers',
                NO_PERMISSION_EXPORT: 'Exportation non permise',
                NO_EXPORT: 'Aucun fichier à exporter',
                DOWNLOAD: 'Télécharger le fichier',
                NO_DOWNLOAD: 'Fichier non disponible',
                NO_PERMISSION_DOWNLOAD: 'Téléchargement non permis',
            },
        },
        DETAILS: {
            UNIQ_ID: 'Identifiant',
            REPORT_TYPE: 'Type de demande',
            OPERATORS: 'Opérateurs',
            SOURCE: 'Canal',
            INITIATOR: 'Numéro initiateur',
            REPORTED_AT: 'Signalé le',
            DESCRIPTION: 'Description',
            STATUS_FIELD: 'Statut',
            LOCATION_NAME: 'Lien avec la zone',
            REGION: 'Région',
            DEPARTMENT: 'Département',
            MUNICIPALITY: 'Commune/Sous-préfecture',
            PLACE_DESCRIPTION: "Description de l'endroit",
            LATITUDE: 'Latitude',
            LONGITUDE: 'Longitude',
            LOCATION_DESCRIPTION: 'Description de la localisation',
            OPEN_MAP: 'Ouvrir sur OpenStreetMap',
            TABS: {
                INFORMATION: 'Informations',
                PHOTOS: 'Images',
                LOCATION: 'Vue géographique',
            },
            PHOTOS: {
                EMPTY: 'Aucune image disponible',
                ALT: 'Photo du signalement',
            },
            STATUS: {
                PENDING: 'En attente',
                APPROVED: 'Approuvé',
                REJECTED: 'Rejeté',
                ABANDONED: 'Abandonné',
                IN_PROGRESS: 'En cours',
                TERMINATED: 'Terminé',
                CONFIRMED: 'Confirmé',
            },
            CALLBACK: {
                WHATSAPP: 'WhatsApp',
                APPEL: 'Appel téléphonique',
            },
            EDIT: {
                TITLE: 'Modifier le signalement',
                LATITUDE: 'Latitude',
                LONGITUDE: 'Longitude',
                LOCATION_NAME: 'Lien avec la zone',
                REPORT_TYPE: 'Type de demande',
                OPERATORS: 'Opérateurs concernés',
                DESCRIPTION: 'Description du signalement',
                PLACE_DESCRIPTION: "Description de l'endroit",
                PLACE_PHOTO: 'Photo du lieu',
                PLACE_PHOTO_ALT: 'Photo actuelle du signalement',
            },
            CONFIRM: {
                TAKE: {
                    TITLE: 'Prise en charge',
                    MESSAGE:
                        'Confirmer la prise en charge de la demande {uniqId} ?',
                },
                APPROVE: {
                    TITLE: 'Qualification',
                    MESSAGE:
                        'Confirmer la qualification de la demande {uniqId} ?',
                },
                REJECT: {
                    TITLE: 'Rejet',
                    MESSAGE: 'Confirmer le rejet de la demande {uniqId} ?',
                },
            },
            QUALIFICATION: {
                DECISION: 'Décision',
                APPROVE: 'Approuver',
                REJECT: 'Rejeter',
                MOTIF_LABEL: 'Motif',
                COMMENT: 'Commentaire',
                DECISION_REQUIRED: 'La décision est requise.',
                REASON_REQUIRED: 'Le motif est requis pour un rejet.',
                COMMENT_REQUIRED: 'Le commentaire est requis pour un rejet.',
                CALLBACK_TYPE_REQUIRED: 'Le type de rappel est requis.',
                VALIDATION_ERROR: 'Veuillez compléter le formulaire.',
                EDIT_FIELDS_REQUIRED:
                    'Veuillez compléter tous les champs modifiables.',
                MOTIFS: {
                    DUP: '[DUP] Signalement en doublon',
                    HOP: '[HOP] Signalement hors périmètre',
                    IFM: '[IFM] Informations incomplètes',
                    FAS: '[FAS] Faux signalement',
                    EXP: '[EXP] Expiration de délais',
                    AUT: '[AUT] Autre raison',
                },
            },
            FILTER: {
                UNIQ_ID_REQUIRED: "L'identifiant est requis",
            },
            TAKE: {
                UNIQ_ID_REQUIRED: "L'identifiant est requis",
            },
        },
    },
} as const;
