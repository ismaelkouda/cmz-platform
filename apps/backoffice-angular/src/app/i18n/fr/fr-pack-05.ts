/** Fragment i18n FR — PROCESSING, REQUESTS, FINALIZATION, MANAGEMENT, AUTHENTICATION (plafond 800 l.). */
export const FR_PACK_5 = {
    PROCESSING: {
        BREADCRUMB: {
            LABEL: 'Prise en charge',
        },
        QUEUES: {
            TITLE: "Signalements en attente d'affectation",
            BREADCRUMB: {
                LABEL: 'Bac à pioche',
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
                TAKE: 'Ajouter au panier ce signalement',
                SEE_MORE: "Voir plus d'informations",
                EXPORT: 'Exporter la liste de {nb} signalements',
                NO_PERMISSION_EXPORT: 'Exportation non permise',
                NO_EXPORT: 'Aucun signalement à exporter',
                NO_PERMISSION_TAKE:
                    "Impossible d'ajouter au panier ce signalement",
            },
        },
        TASKS: {
            TITLE: 'Signalements en attente de traitement',
            BREADCRUMB: {
                LABEL: 'Panier de tâches',
            },
            TABLE: {
                UNIQ_ID: 'Identifiant',
                REPORT_TYPE: 'Types de signalements',
                OPERATORS: 'Opérateurs',
                SOURCE: 'Canal Emission [Numéro]',
                REPORTED_AT: 'Signalé le',
                ACTION: 'Action',
                EDIT: 'Modifier',
                DELETE: 'Supprimer',
                SEE_MORE: 'Voir plus',
                CLOSURE: 'Clôturer',
            },
            FILTER: {
                INITIATOR: 'Numero initiateur',
                UNIQ_ID: 'Identifiant',
                REPORT_TYPE: 'Types de signalements',
                OPERATORS: 'Opérateur',
                SOURCE: "Canal d'émission",
            },
            TOOLTIP: {
                TREAT: 'Traiter ce signalement',
                SEE_MORE: 'Voir les actions de traitement',
                EXPORT: 'Exporter la liste de {nb} signalements',
                NO_PERMISSION_EXPORT: 'Exportation non permise',
                NO_EXPORT: 'Aucun signalement à exporter',
                NO_PERMISSION_TREAT: 'Impossible de traiter ce signalement',
            },
            ACTIONS: {
                TITLE: 'Actions de traitement',
                BREADCRUMB: {
                    LABEL: 'Actions de traitement',
                },
                TABLE: {
                    DATE_ACTION: "Date de l'action",
                    TYPE: "Type d'action",
                    DESCRIPTION: 'Description',
                    CREATED_BY: 'Créé par',
                    OPERATORS: 'Opérateur',
                    CONFORMITY: 'Conformité',
                    SEE_MORE: 'Voir plus',
                },
                SWEET_ALERT: {
                    TITLE: {
                        DELETE: 'Supprimer cette action',
                        CLOSE: 'Clôturer ce signalement',
                    },
                    MESSAGE: {
                        DELETE: 'Êtes-vous sûr de vouloir supprimer cette action ?',
                        CLOSE: 'Êtes-vous sûr de vouloir clôturer ce signalement ?',
                    },
                },
                TOOLTIP: {
                    EDIT: 'Éditer cette action',
                    DELETE: 'Supprimer cette action',
                    SEE_MORE: "Voir plus d'informations",
                    NO_PERMISSION_CREATE: "Création d'une action non permise",
                    NOT_EDIT: 'Utilisateurs notifiés — édition impossible',
                    NOT_DELETE:
                        'Utilisateurs notifiés — suppression impossible',
                    NO_PERMISSION_CLOSE: 'Clôture non permise',
                },
                DIALOG: {
                    TITLE: {
                        CREATE: "Enregistrement d'une action de traitement",
                        EDIT: "Édition d'une action de traitement",
                        VIEW: 'Mode visualisation',
                    },
                    FORM: {
                        TYPE: "Type d'action",
                        DESCRIPTION: 'Description',
                        DESCRIPTION_PLACEHOLDER:
                            "Ex: Description de l'action de traitement",
                        DATE_ACTION: 'Effectué le',
                        NOTIFY_USERS:
                            'Publier dans le journal et notifier les utilisateurs',
                        CONFORMITY: {
                            TITLE: 'Conformité du résultat avec le signalement',
                            CONFORM: 'Conforme',
                            NO_CONFORM: 'Non conforme',
                        },
                    },
                },
                FORM: {
                    ERROR: {
                        CREATE: {
                            REPORT_UNIQ_ID_REQUIRE:
                                "L'identifiant du signalement est requis",
                            DATE_REQUIRE: 'La date est requise',
                            TYPE_REQUIRE: "Le type d'action est requis",
                            OPERATOR_REQUIRE: "L'opérateur est requis",
                            DESCRIPTION_REQUIRE: 'La description est requise',
                            IS_CONFORM_REQUIRE: 'La conformité est requise',
                        },
                        UPDATE: {
                            UNIQ_ID_REQUIRE:
                                "L'identifiant de l'action est requis",
                            REPORT_UNIQ_ID_REQUIRE:
                                "L'identifiant du signalement est requis",
                            DATE_REQUIRE: 'La date est requise',
                            TYPE_REQUIRE: "Le type d'action est requis",
                            OPERATOR_REQUIRE: "L'opérateur est requis",
                            DESCRIPTION_REQUIRE: 'La description est requise',
                            IS_CONFORM_REQUIRE: 'La conformité est requise',
                        },
                    },
                },
            },
        },
        ALL: {
            TITLE: 'Signalements traités',
            BREADCRUMB: {
                LABEL: 'Tous les signalements',
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
                STATE: 'État',
                STATE_TERMINATED: 'Terminé',
            },
            TOOLTIP: {
                SEE_MORE: "Voir plus d'informations",
                EXPORT: 'Exporter la liste de {nb} signalements',
                NO_PERMISSION_EXPORT: 'Exportation non permise',
                NO_EXPORT: 'Aucun signalement à exporter',
            },
        },
        DETAILS: {
            UNIQ_ID: 'Identifiant',
            REPORT_TYPE: 'Type de signalement',
            OPERATORS: 'Opérateurs',
            SOURCE: 'Canal',
            INITIATOR: 'Numéro initiateur',
            REPORTED_AT: 'Signalé le',
            DESCRIPTION: 'Description',
            CONFIRM: {
                TAKE: {
                    TITLE: 'Confirmer la prise en charge',
                    MESSAGE: 'Ajouter au panier le signalement {uniqId} ?',
                },
                TREAT: {
                    TITLE: 'Confirmer le traitement',
                    MESSAGE: 'Traiter ce signalement ?',
                },
            },
            FILTER: {
                UNIQ_ID_REQUIRED: "L'identifiant est requis",
            },
            TAKE: {
                UNIQ_ID_REQUIRED: "L'identifiant est requis",
            },
            TREAT: {
                UNIQ_ID_REQUIRED: "L'identifiant est requis",
            },
        },
    },
    REQUESTS: {
        BREADCRUMB: {
            LABEL: 'Qualification des demandes',
        },
        QUEUES: {
            TITLE: "Demandes en attente d'affectation",
            BREADCRUMB: {
                LABEL: 'Bac à pioche',
            },
            TABLE: {
                UNIQ_ID: 'Identifiant',
                REPORT_TYPE: 'Types de demandes',
                OPERATORS: 'Opérateurs',
                SOURCE: 'Canal Emission [Numéro]',
                REPORTED_AT: 'Signalé le',
                ACTION: 'Action',
            },
            FILTER: {
                INITIATOR: 'Numero initiateur',
                UNIQ_ID: 'Identifiant',
                REPORT_TYPE: 'Types de demandes',
                OPERATORS: 'Opérateur',
                SOURCE: "Canal d'émission",
            },
            TOOLTIP: {
                REFRESH: 'Rafraîchir la liste des demandes',
                EXPORT: 'Exporter la liste de {nb} demandes',
                TAKE: 'Prendre en charge cette demande',
                SEE_MORE: "Voir plus d'informations",
                NO_PERMISSION_EXPORT: 'Exportation des demandes non permise',
                NO_EXPORT: 'Aucune demande à exporter',
                NO_PERMISSION_TAKE:
                    'Impossible de prendre en charge cette demande',
            },
        },
        TASKS: {
            TITLE: 'Demandes en attente de qualification',
            BREADCRUMB: {
                LABEL: 'Panier de tâches',
            },
            TABLE: {
                UNIQ_ID: 'Identifiant',
                REPORT_TYPE: 'Types de demandes',
                OPERATORS: 'Opérateurs',
                SOURCE: 'Canal Emission [Numéro]',
                REPORTED_AT: 'Signalé le',
                ACTION: 'Action',
            },
            FILTER: {
                INITIATOR: 'Numero initiateur',
                UNIQ_ID: 'Identifiant',
                REPORT_TYPE: 'Types de demandes',
                OPERATORS: 'Opérateur',
                SOURCE: "Canal d'émission",
            },
            TOOLTIP: {
                REFRESH: 'Rafraîchir la liste des demandes',
                EXPORT: 'Exporter la liste de {nb} demandes',
                QUALIFY: 'Qualifier cette demande',
                SEE_MORE: "Voir plus d'informations",
                NO_PERMISSION_EXPORT: 'Exportation des demandes non permise',
                NO_EXPORT: 'Aucune demande à exporter',
                NO_PERMISSION_QUALIFY: 'Impossible de qualifier cette demande',
            },
        },
        ALL: {
            TITLE: 'Demandes qualifiées',
            BREADCRUMB: {
                LABEL: 'Demandes qualifiées',
            },
            TABLE: {
                UNIQ_ID: 'Identifiant',
                REPORT_TYPE: 'Types de demandes',
                OPERATORS: 'Opérateurs',
                SOURCE: 'Canal Emission [Numéro]',
                REPORTED_AT: 'Signalé le',
                ACTION: 'Action',
            },
            FILTER: {
                INITIATOR: 'Numero initiateur',
                UNIQ_ID: 'Identifiant',
                REPORT_TYPE: 'Types de demandes',
                OPERATORS: 'Opérateur',
                SOURCE: "Canal d'émission",
                STATUS: 'Statut',
                STATUS_APPROVED: 'Approuvé',
                STATUS_REJECTED: 'Rejeté',
                STATUS_ABANDONED: 'Abandonné',
                STATUS_IN_PROGRESS: 'En cours',
                STATUS_TERMINATED: 'Terminé',
                STATUS_CONFIRMED: 'Confirmé',
            },
            TOOLTIP: {
                REFRESH: 'Rafraîchir la liste des demandes',
                EXPORT: 'Exporter la liste de {nb} demandes',
                SEE_MORE: "Voir plus d'informations",
                NO_PERMISSION_EXPORT: 'Exportation des demandes non permise',
                NO_EXPORT: 'Aucune demande à exporter',
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
    FINALIZATION: {
        BREADCRUMB: {
            LABEL: 'Finalisation des signalements',
        },
        QUEUES: {
            TITLE: 'Signalements en attente de finalisation',
            BREADCRUMB: {
                LABEL: 'Bac à pioche',
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
        TASKS: {
            TITLE: 'Signalements en cours de finalisation',
            BREADCRUMB: {
                LABEL: 'Panier de tâches',
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
        ALL: {
            TITLE: 'Signalements finalisés',
            BREADCRUMB: {
                LABEL: 'Finalisés',
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
                STATE: 'Statut',
                STATE_TERMINATED: 'Terminé',
            },
            TOOLTIP: {
                REFRESH: 'Rafraîchir la liste',
                EXPORT: 'Exporter la liste de {nb} signalements',
                SEE_MORE: "Voir plus d'informations",
                NO_PERMISSION_EXPORT: 'Exportation non permise',
                NO_EXPORT: 'Aucun signalement à exporter',
            },
        },
        DETAILS: {
            UNIQ_ID: 'Identifiant',
            REPORT_TYPE: 'Type de signalement',
            OPERATORS: 'Opérateurs',
            SOURCE: 'Canal',
            INITIATOR: 'Numéro initiateur',
            REPORTED_AT: 'Signalé le',
            DESCRIPTION: 'Description',
            COMMENT: 'Commentaire de finalisation',
            CONFIRM: {
                TAKE: {
                    TITLE: 'Confirmer la prise en charge',
                    MESSAGE: 'Prendre en charge le signalement {uniqId} ?',
                },
                FINALIZE: {
                    TITLE: 'Confirmer la finalisation',
                    MESSAGE: 'Finaliser ce signalement ?',
                },
            },
            FILTER: {
                UNIQ_ID_REQUIRED: "L'identifiant est requis",
            },
            FINALIZE: {
                COMMENT_REQUIRED: 'Le commentaire est requis',
                UNIQ_ID_REQUIRED: "L'identifiant est requis",
            },
            TAKE: {
                UNIQ_ID_REQUIRED: "L'identifiant est requis",
            },
        },
    },
    MANAGEMENT: {
        STATUS: {
            TAKE: 'Prise en charge',
            TREATMENT: 'Traitement',
            APPROBATION: 'Qualification',
            INFORMATION: 'Informations',
            SUBMISSION: 'Soumission',
            QUALIFICATION: 'Qualification',
            FINALIZATION: 'Prise en charge',
            CLOSURE: 'Clôture',
        },
        BUTTONS: {
            TAKE: 'Ajouter au panier',
            TREATMENT: 'Traiter',
            APPROBATION: 'Qualifier',
            FINALIZATION: 'Finaliser',
            REJECT: 'Rejeter',
            INFORMATION: 'Fermer',
        },
        HEADER: {
            DETAILS_REPORT: 'du signalement',
            DETAILS_DEMAND: 'de la demande',
            NUMBER_OF_CONFIRMATIONS: 'Nombre de confirmations',
        },
        SIDEBAR: {
            INITIATOR: {
                PHONE: 'Contact',
                EMAIL: 'Email',
            },
            APPROVER: {
                LAST_NAME: 'Nom',
                FIRST_NAME: 'Prénoms',
                PHONE: 'Contact',
            },
            REFUSER: {
                LAST_NAME: 'Nom',
                FIRST_NAME: 'Prénoms',
                PHONE: 'Contact',
            },
        },
        FORM: {
            REPORT_INFO: {
                TRANSMISSION_CHANNEL: 'Canal de transmission',
                STATUS: 'Statut',
            },
        },
        TREATMENT: {
            CALLBACK_ACTION: {
                TITLE: 'Mode de qualification',
                CALLBACK_TYPE: 'Type de rappel',
                OPTIONS: {
                    DETAILS: {
                        LABEL: 'Visualisation',
                    },
                    EDIT: {
                        LABEL: 'Modifier',
                    },
                    CALLBACK: {
                        LABEL: 'Callback',
                    },
                },
            },
        },
    },
    AUTHENTICATION: {
        LOGIN: {
            TITLE: 'Connexion',
            FORM: {
                EMAIL: 'Email',
                PASSWORD: 'Mot de passe',
            },
            ACTION: {
                SUBMIT: 'Se connecter',
                FORGOT_PASSWORD: 'Mot de passe oublié ?',
            },
        },
        FORGOT_PASSWORD: {
            TITLE: 'Mot de passe oublié',
            FORM: {
                EMAIL: 'Email',
            },
            ACTION: {
                SUBMIT: 'Envoyer',
                BACK_TO_LOGIN: 'Retour à la connexion',
            },
            MESSAGE: {
                EMAIL_SENT:
                    'Si un compte existe pour cet email, un lien de réinitialisation vient de lui être envoyé.',
            },
        },
        RESET_PASSWORD: {
            TITLE: 'Réinitialiser le mot de passe',
            FORM: {
                PASSWORD: 'Nouveau mot de passe',
                CONFIRM_PASSWORD: 'Confirmer le mot de passe',
                ERROR: {
                    TOKEN_REQUIRE: 'Le jeton est requis',
                },
            },
            ACTION: {
                SUBMIT: 'Réinitialiser',
            },
        },
    },
} as const;
