// --- Interface for Citekey Generation Options ---
// Moved here from citekey-generator.ts to avoid circular dependency issues
// and keep settings-related types together.

/**
 * Options for citekey generation
 */
export interface CitekeyOptions {
        /**
         * User-defined template for citekey generation.
         * Example: '{{author|lowercase}}{{year}}{{title|titleword}}'
         * Uses the same Mustache syntax as other templates.
         * Default: '{{author|lowercase}}{{year}}'
         */
        citekeyTemplate: string;

        /**
         * Minimum length for a citekey before adding a random suffix
         * Default: 6
         */
        minCitekeyLength: number;
}


/**
 * Interface for custom frontmatter field templates
 */
export interface CustomFrontmatterField {
    name: string;    // Field name in frontmatter
    template: string; // Template with variables
    enabled: boolean; // Whether this field is enabled
    insertAfter?: string; // Optional: name of standard CSL field after which this custom field will be inserted (use 'start' or 'end')
}

/**
 * Interface for favorite languages configuration
 */
export interface FavoriteLanguage {
    code: string;  // ISO 639-1 or 639-2 language code
    name: string;  // Display name for the language
}

/**
 * Interface for configurable modal field definitions
 */
export interface ModalFieldConfig {
    name: string; // CSL field key (e.g., "archive", "URL")
    label: string; // Display label (e.g., "Archive Name")
    type: 'text' | 'textarea' | 'number' | 'date' | 'toggle' | 'dropdown'; // Input control type
    description?: string;
    placeholder?: string;
    required?: boolean; // For UI hint/future validation
    options?: Array<{ value: string; text: string }>; // For dropdown
    defaultValue?: string | boolean | number; // For new notes
}

/**
 * Standard CSL frontmatter fields that can be toggled on/off
 */
export interface StandardFrontmatterField {
    name: string; // CSL field key (e.g., "title", "DOI")
    label: string; // Display label
        enabled: boolean; // Whether this field should be included in frontmatter
        alias?: string; // Optional alternative key name to use in the generated frontmatter
}

// --- Interface for Overall Plugin Settings ---

export interface BibliographyPluginSettings {
        attachmentFolderPath: string;
        literatureNotePath: string;
        filenameTemplate: string; // Filename template option
        createAttachmentSubfolder: boolean;
        // Bibliography and file options
        bibliographyJsonPath: string;
        citekeyListPath: string;
        bibtexFilePath: string;
        // Template options
        headerTemplate: string;
        chapterHeaderTemplate: string;
        // Other settings
        literatureNoteTag: string;
        openNoteOnCreate: boolean;
        tempPdfPath: string;
        // Frontmatter field control
        standardFrontmatterFields: StandardFrontmatterField[]; // Control which CSL fields appear in frontmatter
        // Template systems
        customFrontmatterFields: CustomFrontmatterField[]; // Custom frontmatter fields with templating
        // Additional fields whitelist: only these names will be included in frontmatter (empty = none)
        additionalFieldsWhitelist: string[];
        citekeyOptions: CitekeyOptions; // Uses the interface defined above
        // Bulk import settings
        bulkImportAttachmentHandling: 'none' | 'import';
        bulkImportAnnoteToBody: boolean;
        bulkImportCitekeyPreference: 'imported' | 'generate';
        bulkImportConflictResolution: 'skip' | 'overwrite';
        // Favorite languages settings
        favoriteLanguages: FavoriteLanguage[];
        // Default modal fields configuration
        defaultModalFields: ModalFieldConfig[];
        // Edit modal settings
        editRegenerateCitekeyDefault: boolean;
        editUpdateCustomFrontmatterDefault: boolean;
        editRegenerateBodyDefault: boolean;
        editRenameFileOnCitekeyChange: boolean;
}

// --- Default Plugin Settings ---

export const DEFAULT_SETTINGS: BibliographyPluginSettings = {
        attachmentFolderPath: 'biblib',
        literatureNotePath: '/',
        filenameTemplate: '@{{citekey}}',
        createAttachmentSubfolder: true,
        bibliographyJsonPath: 'biblib/bibliography.json',
        citekeyListPath: 'citekeylist.md',
        bibtexFilePath: 'biblib/bibliography.bib',
        headerTemplate: '# {{#title}}{{title}}{{/title}}{{^title}}{{citekey}}{{/title}} \n\n _Notes_',
        chapterHeaderTemplate: '# {{#pdflink}}[[{{pdflink}}|{{title}}]]{{/pdflink}}{{^pdflink}}{{title}}{{/pdflink}} (in {{container-title}})',
        literatureNoteTag: '',
        openNoteOnCreate: true,
        tempPdfPath: '',
        // Default standard frontmatter fields (minimal set)
        standardFrontmatterFields: [
                { name: 'id', label: 'ID', enabled: true, alias: 'id' },
                { name: 'type', label: 'Type', enabled: true, alias: 'type' },
                { name: 'title', label: 'Title', enabled: true, alias: 'title' },
                { name: 'author', label: 'Author', enabled: true, alias: 'author' },
                { name: 'issued', label: 'Date Issued', enabled: true, alias: 'issued' },
                { name: 'URL', label: 'URL', enabled: false, alias: 'URL' },
                { name: 'DOI', label: 'DOI', enabled: false, alias: 'DOI' },
                { name: 'page', label: 'Page', enabled: false, alias: 'page' },
                { name: 'container-title', label: 'Container Title', enabled: false, alias: 'container-title' },
                { name: 'publisher', label: 'Publisher', enabled: false, alias: 'publisher' },
                { name: 'publisher-place', label: 'Publisher Place', enabled: false, alias: 'publisher-place' },
                { name: 'volume', label: 'Volume', enabled: false, alias: 'volume' },
                { name: 'edition', label: 'Edition', enabled: false, alias: 'edition' },
                { name: 'number', label: 'Number', enabled: false, alias: 'number' },
                { name: 'language', label: 'Language', enabled: false, alias: 'language' },
                { name: 'abstract', label: 'Abstract', enabled: false, alias: 'abstract' },
                { name: 'title-short', label: 'Short Title', enabled: false, alias: 'title-short' }
        ],
        // Default custom frontmatter fields
        customFrontmatterFields: [
                {
                        name: 'year',
                        template: '{{year}}',
                        enabled: true,
                        insertAfter: 'issued'
                },
                {
                        name: 'dateCreated',
                        template: '{{currentDate}}',
                        enabled: true,
                        insertAfter: 'issued'
                },
                {
                        name: 'reading-status',
                        template: 'to-read',
                        enabled: true,
                        insertAfter: 'end'
                },
                {
                        name: 'aliases',
                        template: '["{{title|sentence}}"]',
                        enabled: true,
                        insertAfter: 'end'
                },
                {
                        name: 'author-links',
                        template: '[{{#authors}}"[[Author/{{.}}]]",{{/authors}}]',
                        enabled: true,
                        insertAfter: 'author'
                },
                {
                        name: 'attachment',
                        template: '[{{#attachments}}{{.}},{{/attachments}}]',
                        enabled: true,
                        insertAfter: 'end'
                },
                {
                        name: 'related',
                        template: '[{{links}}]',
                        enabled: true,
                        insertAfter: 'end'
                }
        ],
        // Additional fields whitelist (only these field names will be included; empty = exclude all)
        // Default: only include 'keyword' and convert it to tags
        additionalFieldsWhitelist: ['keyword'],
        // Default citekey options
        citekeyOptions: {
                citekeyTemplate: '{{author|lowercase}}{{title|titleword}}{{year}}', // Default to mustache template
                minCitekeyLength: 6
        },
        // Default bulk import settings
        bulkImportAttachmentHandling: 'none',
        bulkImportAnnoteToBody: true,
        bulkImportCitekeyPreference: 'imported',
        bulkImportConflictResolution: 'skip',
        // Default favorite languages
        favoriteLanguages: [
                { code: 'en', name: 'English' },
                { code: 'de', name: 'German' }
        ],
        // Default modal fields (empty by default, users can add archival fields etc.)
        defaultModalFields: [],
        // Default edit modal settings
        editRegenerateCitekeyDefault: false,
        editUpdateCustomFrontmatterDefault: true,
        editRegenerateBodyDefault: false,
        editRenameFileOnCitekeyChange: true
};
