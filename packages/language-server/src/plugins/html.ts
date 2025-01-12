import { CompletionItemKind, ServicePlugin, ServicePluginInstance } from '@volar/language-server';
import { create as createHtmlService } from 'volar-service-html';
import { AstroVirtualCode } from '../core/index.js';
import { astroAttributes, astroElements, classListAttribute } from './html-data.js';
import { isInComponentStartTag } from './utils.js';

export const create = (): ServicePlugin => {
	const htmlServicePlugin = createHtmlService();
	return {
		...htmlServicePlugin,
		create(context): ServicePluginInstance {
			const htmlPlugin = htmlServicePlugin.create(context);

			htmlPlugin.provide['html/updateCustomData']?.([
				astroAttributes,
				astroElements,
				classListAttribute,
			]);

			return {
				...htmlPlugin,
				async provideCompletionItems(document, position, completionContext, token) {
					if (document.languageId !== 'html') return;

					const [_, source] = context.documents.getVirtualCodeByUri(document.uri);
					const code = source?.generated?.code;
					if (!(code instanceof AstroVirtualCode)) return;

					// Don't return completions if the current node is a component
					if (isInComponentStartTag(code.htmlDocument, document.offsetAt(position))) {
						return null;
					}

					const completions = await htmlPlugin.provideCompletionItems!(
						document,
						position,
						completionContext,
						token
					);

					if (!completions) {
						return null;
					}

					// We don't want completions for file references, as they're mostly invalid for Astro
					completions.items = completions.items.filter(
						(completion) => completion.kind !== CompletionItemKind.File
					);

					return completions;
				},
				// Document links provided by `vscode-html-languageservice` are invalid for Astro
				provideDocumentLinks() {
					return [];
				},
			};
		},
	};
};
