import { stringifyYaml } from 'obsidian';
import { BibliographyPluginSettings } from '../types';
import { Citation, Contributor, AdditionalField } from '../types/citation';
import { TemplateEngine } from '../utils/template-engine';
import { TemplateVariableBuilderService } from './template-variable-builder-service';
import { processYamlArray } from '../utils/yaml-utils';

/**
 * Input for building a YAML frontmatter
 */
export interface FrontmatterInput {
  citation: Citation; // Core CSL data
  contributors: Contributor[];
  additionalFields: AdditionalField[]; // Fields not part of core CSL structure
  attachmentPaths?: string[]; // Normalized paths in vault if attachments exist
  pluginSettings: BibliographyPluginSettings; // To access custom fields, tag etc.
  relatedNotePaths?: string[]; // Paths to related notes
}

/**
 * Service responsible for generating YAML frontmatter based on citation data and settings
 */
export class FrontmatterBuilderService {
  private templateVariableBuilder: TemplateVariableBuilderService;

  constructor(templateVariableBuilder: TemplateVariableBuilderService) {
    this.templateVariableBuilder = templateVariableBuilder;
  }

  /**
   * Check if a standard CSL field is enabled in the plugin settings
   * @param fieldName The name of the field to check
   * @param pluginSettings The plugin settings
   * @returns Whether the field is enabled
   */
  private isFieldEnabled(fieldName: string, pluginSettings: BibliographyPluginSettings): boolean {
    if (!pluginSettings?.standardFrontmatterFields) {
      return true; // Default to true if no settings exist
    }
    const field = pluginSettings.standardFrontmatterFields.find(f => f.name === fieldName);
    return field?.enabled ?? true; // Default to true if field not found
  }

  /**
   * Build YAML frontmatter string from citation data and settings
   * @param data The input data for frontmatter generation
   * @returns Formatted YAML frontmatter string
   */
  async buildYamlFrontmatter(data: FrontmatterInput): Promise<string> {
    try {
      const { citation, contributors, additionalFields, attachmentPaths, pluginSettings, relatedNotePaths } = data;

      // Build base frontmatter object in the order defined in settings
      const frontmatter: Record<string, any> = {};

      // Build template variables early so custom fields can be rendered in any position
      const templateVariables = this.templateVariableBuilder.buildVariables(
        citation,
        contributors,
        attachmentPaths,
        relatedNotePaths
      );

      const standardFields = pluginSettings?.standardFrontmatterFields || [];
      const enabledCustomFields = (pluginSettings?.customFrontmatterFields || []).filter(f => f.enabled);

      // Group custom fields by insertAfter key (use 'start' and 'end' as special keys)
      const customByAfter: Record<string, typeof enabledCustomFields> = {} as any;
      for (const cf of enabledCustomFields) {
        const key = cf.insertAfter ? cf.insertAfter : 'end';
        if (!customByAfter[key]) customByAfter[key] = [];
        customByAfter[key].push(cf);
      }

      // Helper to render and set a custom field into frontmatter
      const renderAndSetCustom = (field: typeof enabledCustomFields[0]) => {
        // Special passthroughs
        if (field.name === 'pdflink' && field.template === '{{pdflink}}') {
          const vars: any = templateVariables;
          if (vars.pdflink?.length > 0) {
            frontmatter[field.name] = vars.pdflink;
          }
          return;
        }
        if (field.name === 'attachment' && field.template === '{{attachment}}') {
          const vars: any = templateVariables;
          if (vars.attachments?.length > 0) {
            frontmatter[field.name] = vars.attachments;
          }
          return;
        }

        // Skip if already present (don't overwrite standard fields)
        if (frontmatter.hasOwnProperty(field.name)) return;

        const isArrayTemplate = field.template.trim().startsWith('[') && field.template.trim().endsWith(']');
        const renderedValue = TemplateEngine.render(field.template, templateVariables, { yamlArray: isArrayTemplate });

        if ((renderedValue.startsWith('[') && renderedValue.endsWith(']')) ||
            (renderedValue.startsWith('{') && renderedValue.endsWith('}'))) {
          try {
            const processedValue = isArrayTemplate ? processYamlArray(renderedValue) : renderedValue;
            frontmatter[field.name] = JSON.parse(processedValue);
          } catch (e) {
            if (isArrayTemplate && (renderedValue.trim() === '[]' || renderedValue.trim() === '[ ]')) {
              frontmatter[field.name] = [];
            } else if (isArrayTemplate && (renderedValue.includes('{{pdflink}}') || renderedValue.includes('{{attachment}}')) && (templateVariables as any).attachments?.length > 0) {
              frontmatter[field.name] = (templateVariables as any).attachments || [];
            } else {
              frontmatter[field.name] = renderedValue;
            }
          }
        } else if (renderedValue.trim() === '') {
          if (isArrayTemplate) frontmatter[field.name] = [];
        } else {
          if (!renderedValue.includes('{{pdflink}}') && !renderedValue.includes('{{attachment}}')) {
            frontmatter[field.name] = renderedValue;
          }
        }
      };

      // Insert any custom fields that want to be at the start
      if (customByAfter['start']) {
        for (const cf of customByAfter['start']) renderAndSetCustom(cf);
      }

      // Iterate standard fields and insert custom fields after each as requested
      for (const field of standardFields) {
        if (!field.enabled) continue;
        const key = field.alias && field.alias.trim() !== '' ? field.alias : field.name;

        switch (field.name) {
          case 'id':
            if (citation.id) frontmatter[key] = citation.id;
            break;
          case 'type':
            if (citation.type) frontmatter[key] = citation.type;
            break;
          case 'title':
            if (citation.title) frontmatter[key] = citation.title;
            break;
          case 'issued': {
            const parts: number[] = [];
            if (citation.year) parts.push(Number(citation.year));
            if (citation.month) parts.push(Number(citation.month));
            if (citation.day) parts.push(Number(citation.day));
            if (parts.length > 0) {
              frontmatter[key] = { 'date-parts': [parts] };
            }
            break;
          }
          case 'title-short':
            if (citation['title-short']) frontmatter[key] = citation['title-short'];
            break;
          case 'page':
            if (citation.page) frontmatter[key] = citation.page;
            break;
          case 'URL':
            if (citation.URL) frontmatter[key] = citation.URL;
            break;
          case 'DOI':
            if (citation.DOI) frontmatter[key] = citation.DOI;
            break;
          case 'container-title':
            if (citation['container-title']) frontmatter[key] = citation['container-title'];
            break;
          case 'publisher':
            if (citation.publisher) frontmatter[key] = citation.publisher;
            break;
          case 'publisher-place':
            if (citation['publisher-place']) frontmatter[key] = citation['publisher-place'];
            break;
          case 'edition':
            if (citation.edition) frontmatter[key] = isNaN(Number(citation.edition)) ? citation.edition : Number(citation.edition);
            break;
          case 'volume':
            if (citation.volume) frontmatter[key] = isNaN(Number(citation.volume)) ? citation.volume : Number(citation.volume);
            break;
          case 'number':
            if (citation.number) frontmatter[key] = isNaN(Number(citation.number)) ? citation.number : Number(citation.number);
            break;
          case 'language':
            if (citation.language) frontmatter[key] = citation.language;
            break;
          case 'abstract':
            if (citation.abstract) frontmatter[key] = citation.abstract;
            break;
          case 'author': {
            // Insert authors at this position if present
            const authors = contributors
              .filter(c => c.role === 'author')
              .map(({ role, ...p }) => p);
            if (authors.length > 0) {
              frontmatter[key] = authors;
            }
            break;
          }
          default: {
            // Fallback: copy value from citation if present
            const val = (citation as any)[field.name];
            if (val !== undefined && val !== null && val !== '') {
              frontmatter[key] = val;
            }
          }
        }

        // Insert any custom fields that requested to be after this standard field
        if (customByAfter[field.name]) {
          for (const cf of customByAfter[field.name]) renderAndSetCustom(cf);
        }
      }

      // Insert any custom fields that want to be at the end
      if (customByAfter['end']) {
        for (const cf of customByAfter['end']) renderAndSetCustom(cf);
      }

      // Ensure literature note tag is always present, while preserving any existing tags
      const allTags = citation.tags && Array.isArray(citation.tags) ? [...citation.tags] : [];
      if (pluginSettings.literatureNoteTag && pluginSettings.literatureNoteTag.trim()) {
        allTags.push(pluginSettings.literatureNoteTag);
      }
      frontmatter['tags'] = [...new Set(allTags)].filter(t => t && String(t).trim());

      // Add additional fields to frontmatter (after tags are initialized so keywords can merge into tags)
      this.addAdditionalFieldsToFrontmatter(frontmatter, additionalFields);

      // // Add remaining contributor roles (non-author) to the end of frontmatter
      // const otherContributors = contributors.filter(c => c.role !== 'author');
      // if (otherContributors.length > 0) {
      //   this.addContributorsToFrontmatter(frontmatter, otherContributors);
      // }


return stringifyYaml(frontmatter);
    } catch (error) {
      console.error('Error creating frontmatter:', error);
      throw error;
    }
  }

  /**
   * Add contributors to frontmatter object
   * @param frontmatter The frontmatter object to modify
   * @param contributors Array of contributors to add
   */
  private addContributorsToFrontmatter(
    frontmatter: Record<string, any>,
    contributors: Contributor[]
  ): void {
    contributors.forEach(contributor => {
      // Only include entries with at least one name or other identifier
      if (contributor.family || contributor.given || contributor.literal) {
        if (!frontmatter[contributor.role]) {
          frontmatter[contributor.role] = [];
        }
        // Copy all contributor properties except the role
        const { role, ...personData } = contributor;
        frontmatter[contributor.role].push(personData);
      }
    });
  }

  /**
   * Add additional fields to frontmatter object
   * @param frontmatter The frontmatter object to modify
   * @param additionalFields Array of additional fields to add
   */
  private addAdditionalFieldsToFrontmatter(
    frontmatter: Record<string, any>,
    additionalFields: AdditionalField[]
  ): void {
    additionalFields.forEach((field) => {
      // Filter out fields without names or values
      if (!field.name || field.name.trim() === '') {
        return;
      }

      // For non-date fields, check standard empty conditions
      if (field.value == null || field.value === '') {
        return;
      }

      const lname = field.name.trim().toLowerCase();
      if (lname === 'keyword' || lname === 'keywords') {
        // Parse keywords (split by comma, semicolon, or pipe, then replace spaces with underscores)
        const toStrings = (val: any): string[] => {
          if (Array.isArray(val)) {
            return val.flatMap(v => String(v).split(/[,;|]/)).map(s => s.trim().replace(/ /g, '_')).filter(Boolean);
          }
          if (typeof val === 'string') {
            return val.split(/[,;|]/).map(s => s.trim().replace(/ /g, '_')).filter(Boolean);
          }
          return [String(val).replace(/ /g, '_')];
        };

        const kws = toStrings(field.value);
        if (kws.length > 0 && Array.isArray(frontmatter['tags'])) {
          // Merge keywords into existing tags array
          const merged = [...new Set([...frontmatter['tags'], ...kws])];
          frontmatter['tags'] = merged;
        }
      }
    });
  }


  /**
   * Process custom frontmatter fields from plugin settings
   * @param frontmatter The frontmatter object to modify
   * @param citation The citation data
   * @param contributors Array of contributors
   * @param attachmentPaths Optional paths to attachments
   * @param pluginSettings Plugin settings containing custom field definitions
   */
  private async processCustomFrontmatterFields(
    frontmatter: Record<string, any>,
    citation: Citation,
    contributors: Contributor[],
    attachmentPaths?: string[],
    pluginSettings?: BibliographyPluginSettings,
    relatedNotePaths?: string[]
  ): Promise<void> {
    if (!pluginSettings?.customFrontmatterFields?.length) {
      return;
    }

    // Build template variables
    const templateVariables = this.templateVariableBuilder.buildVariables(
      citation,
      contributors,
      attachmentPaths,
      relatedNotePaths
    );

    // Filter to enabled custom fields
    const enabledFields = pluginSettings.customFrontmatterFields.filter(field => field.enabled);

    // Process each enabled custom field
    for (const field of enabledFields) {
      // Special case handling for attachment fields with direct passthrough
      if (field.name === 'pdflink' && field.template === '{{pdflink}}') {
        if (templateVariables.pdflink?.length > 0) {
          frontmatter[field.name] = templateVariables.pdflink;
        }
        continue;
      }

      if (field.name === 'attachment' && field.template === '{{attachment}}') {
        if (templateVariables.attachments?.length > 0) {
          frontmatter[field.name] = templateVariables.attachments;
        }
        continue;
      }

      // Skip if field name already exists in frontmatter (don't overwrite standard fields)
      if (frontmatter.hasOwnProperty(field.name)) {
        continue;
      }

      // Determine if this looks like an array/object template
      const isArrayTemplate = field.template.trim().startsWith('[') &&
                             field.template.trim().endsWith(']');

      // Render the template with appropriate options
      const renderedValue = TemplateEngine.render(
        field.template,
        templateVariables,
        { yamlArray: isArrayTemplate }
      );

      // Handle different types of rendered values
      if ((renderedValue.startsWith('[') && renderedValue.endsWith(']')) ||
          (renderedValue.startsWith('{') && renderedValue.endsWith('}'))) {
        try {
          // For array templates, process with our shared utility function first
          const processedValue = isArrayTemplate ? processYamlArray(renderedValue) : renderedValue;

          // Parse as JSON for arrays and objects
          frontmatter[field.name] = JSON.parse(processedValue);
        } catch (e) {
          // Special handling for array templates that should be empty arrays
          if (isArrayTemplate && (renderedValue.trim() === '[]' || renderedValue.trim() === '[ ]')) {
            frontmatter[field.name] = [];
          } else if (isArrayTemplate &&
                    (renderedValue.includes('{{pdflink}}') || renderedValue.includes('{{attachment}}')) &&
                    templateVariables.attachments?.length > 0) {
            // Handle array template containing attachments
            frontmatter[field.name] = templateVariables.attachments || [];
          } else {
            // Use as string if JSON parsing fails and no special case
            frontmatter[field.name] = renderedValue;
          }
        }
      } else if (renderedValue.trim() === '') {
        // For truly empty values in array templates, add empty array
        if (isArrayTemplate) {
          frontmatter[field.name] = [];
        }
        // Otherwise, don't add empty fields at all
      } else {
        // If the field value contains variable references that didn't render
        if (renderedValue.includes('{{pdflink}}') || renderedValue.includes('{{attachment}}')) {
          // Don't add the field if the template wasn't properly rendered
          // This indicates the attachment variable wasn't available
        } else {
          // Use as string for non-array/object values
          frontmatter[field.name] = renderedValue;
        }
      }
    }
  }
}