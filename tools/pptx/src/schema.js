import { z } from 'zod';

const finite = z.number().finite();
const color = z.string().max(64);

const textStyle = z.object({
  fontSize: finite.positive().optional(),
  fontFamily: z.string().max(80).optional(),   // '$heading' | '$body' | literal
  fontWeight: z.union([finite, z.enum(['normal', 'bold'])]).optional(),
  fontStyle: z.enum(['normal', 'italic']).optional(),
  lineHeight: finite.positive().optional(),
  letterSpacing: finite.optional(),
  textAlign: z.enum(['left', 'center', 'right']).optional(),
  fill: color.optional(),
}).passthrough();

const shapeStyle = z.object({
  shape: z.enum(['rect', 'ellipse', 'line']).optional(),
  fill: color.optional(),
  stroke: color.optional(),
  strokeWidth: finite.nonnegative().optional(),
  borderRadius: finite.nonnegative().optional(),
}).passthrough();

const baseNode = {
  id: z.string().max(80).optional(),
  name: z.string().max(80).optional(),
  x: finite, y: finite,
  width: finite.nonnegative(), height: finite.nonnegative(),
  rotation: finite.optional(),
  opacity: finite.min(0).max(1).optional(),
  visible: z.boolean().optional(),
  // click builds in the exported PPTX: hidden until the Nth click, then enters with fx
  step: z.number().int().min(0).max(50).optional(),
  fx: z.enum(['fade', 'wipe']).optional(),
};

export const nodeSchema = z.discriminatedUnion('type', [
  z.object({ ...baseNode, type: z.literal('text'), text: z.string().max(20000), style: textStyle.optional() }),
  z.object({ ...baseNode, type: z.literal('shape'), style: shapeStyle.optional() }),
  z.object({ ...baseNode, type: z.literal('image'), src: z.string().max(2000), fit: z.enum(['cover', 'contain']).optional(), style: z.object({ borderRadius: finite.optional() }).passthrough().optional() }),
]);

export const pageSchema = z.object({
  id: z.string().max(80).optional(),
  name: z.string().max(200),
  width: finite.positive().optional(),
  height: finite.positive().optional(),
  background: color.optional(),
  notes: z.string().max(20000).optional(),
  nodes: z.array(nodeSchema).max(500),
}).passthrough();

export const deckSchema = z.object({
  name: z.string().max(200),
  width: finite.positive().default(1280),
  height: finite.positive().default(720),
  theme: z.union([z.string(), z.object({}).passthrough()]).optional(),
  transition: z.enum(['none', 'dissolve', 'fade', 'push']).optional(),   // between slides, PPTX only
  pages: z.array(pageSchema).min(1).max(200),
}).passthrough();

/** Parse + normalise: every page gets explicit width/height, every node an id and name. */
export function parseDeck(raw) {
  const deck = deckSchema.parse(raw);
  deck.pages = deck.pages.map((page, pi) => ({
    ...page,
    id: page.id ?? `p${pi + 1}`,
    width: page.width ?? deck.width,
    height: page.height ?? deck.height,
    background: page.background ?? '$background',
    nodes: page.nodes.map((n, ni) => ({ ...n, id: n.id ?? `p${pi + 1}n${ni + 1}`, name: n.name ?? `${n.type} ${ni + 1}` })),
  }));
  return deck;
}
