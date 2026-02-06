import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { DiffChunk } from './diff-engine'

export interface DiffDecorationOptions {
  chunks: DiffChunk[]
  selectionFrom: number
  selectionTo: number
}

const diffDecorationKey = new PluginKey('diffDecoration')

export const DiffDecorationExtension = Extension.create<DiffDecorationOptions>({
  name: 'diffDecoration',

  addOptions() {
    return {
      chunks: [],
      selectionFrom: 0,
      selectionTo: 0,
    }
  },

  addProseMirrorPlugins() {
    const extensionThis = this

    return [
      new Plugin({
        key: diffDecorationKey,
        props: {
          decorations(state) {
            const { chunks, selectionFrom, selectionTo } =
              extensionThis.options
            const decorations: Decoration[] = []
            const docSize = state.doc.content.size

            // Deemphasis: before selection
            if (selectionFrom > 1 && selectionFrom <= docSize - 1) {
              decorations.push(
                Decoration.inline(1, Math.min(selectionFrom, docSize - 1), {
                  class: 'diff-deemphasized',
                })
              )
            }

            // Deemphasis: after selection
            if (selectionTo > 0 && selectionTo < docSize - 1) {
              decorations.push(
                Decoration.inline(Math.max(1, selectionTo), docSize - 1, {
                  class: 'diff-deemphasized',
                })
              )
            }

            // Diff chunk decorations within the selection range
            let pos = selectionFrom
            for (const chunk of chunks) {
              const len = chunk.text.length
              if (len === 0) continue

              const from = pos
              const to = Math.min(pos + len, docSize - 1)

              if (from >= to) {
                pos = to
                continue
              }

              if (chunk.type === 'equal') {
                // no decoration for equal chunks
              } else if (chunk.type === 'add') {
                const cls =
                  chunk.status === 'accepted'
                    ? 'diff-accepted'
                    : chunk.status === 'pending'
                      ? 'diff-add'
                      : ''
                if (cls) {
                  decorations.push(
                    Decoration.inline(from, to, {
                      class: cls,
                      'data-chunk-id': chunk.id,
                    })
                  )
                }
              } else if (chunk.type === 'remove') {
                if (chunk.status === 'pending') {
                  decorations.push(
                    Decoration.inline(from, to, {
                      class: 'diff-remove',
                      'data-chunk-id': chunk.id,
                    })
                  )
                }
              }

              pos = to
            }

            return DecorationSet.create(state.doc, decorations)
          },
        },
      }),
    ]
  },
})
