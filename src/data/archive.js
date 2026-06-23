/**
 * archive.js
 *
 * Editorial content for the FirstPhoto Research Archive.
 * This is the primary identity layer of the project.
 * Analysis tools exist in service of this archive, not the other way around.
 */

export const ARCHIVE = {
  volume: 'I',
  title: 'First Impressions in Still Photography',
  subtitle: 'A Study of Visual Signals',
  description:
    'This volume collects observations on the visual communication of first impressions in still photography. Entries examine how specific photographic decisions — framing, light, expression, background — shape the immediate perceptual response of an observer encountering an unknown subject for the first time.',

  categories: [
    {
      number: 'I',
      title: 'Composition',
      description:
        'On the spatial arrangement of subject, background, and empty space within the photographic frame — and how these relationships produce readings of confidence, openness, and intent.',
      entries: [
        {
          id: '001',
          title: 'The Weight of Negative Space',
          abstract:
            'Examining how unoccupied regions within a photographic frame produce psychological readings of openness, confidence, and spatial intelligence in a viewer\'s first encounter with an unknown subject.',
        },
        {
          id: '002',
          title: 'Eye Level and Perceived Equality',
          abstract:
            'A study of the vertical relationship between lens height and subject position, and how this axis establishes implicit hierarchies of power, vulnerability, and social standing in first impression photographs.',
        },
        {
          id: '003',
          title: 'The Rule of Thirds Versus Centered Portraits',
          abstract:
            'Comparing immediate viewer responses to subjects positioned at compositional thirds against those placed at center frame — examining authority, approachability, and the geometry of trust.',
        },
        {
          id: '004',
          title: 'Vertical Versus Horizontal Framing',
          abstract:
            'On how the orientation chosen for a photograph — portrait or landscape — changes the perceived intimacy, formality, and environmental relationship of its subject to the viewer.',
        },
        {
          id: '005',
          title: 'When the Subject Breaks the Frame',
          abstract:
            'Observations on photographs in which the human subject extends beyond or is partially cropped by the frame boundary, and how this affects readings of energy, informality, and intentionality.',
        },
      ],
    },
    {
      number: 'II',
      title: 'Lighting',
      description:
        'On the quality, direction, and temperature of light as a primary determinant of first impression — and on how illumination decisions communicate warmth, authority, and authenticity before a face is fully registered.',
      entries: [
        {
          id: '011',
          title: 'Diffused Natural Light as a Trust Signal',
          abstract:
            'An examination of soft, directionally ambiguous illumination — typically from overcast sky or a north-facing window — and its persistent correlation with perceived approachability and social openness across observers.',
        },
        {
          id: '012',
          title: 'Side Light and Perceived Dimensionality',
          abstract:
            'How directional light applied from a lateral angle introduces shadow, depth cues, and a sense of physical presence absent in front-lit or evenly illuminated portrait photographs.',
        },
        {
          id: '013',
          title: 'Direction of Light and Authority',
          abstract:
            'Observations on how the spatial origin of illumination — overhead, lateral, from behind, from below — shapes a viewer\'s subconscious reading of confidence, authority, vulnerability, and social standing.',
        },
        {
          id: '014',
          title: 'Window Light Versus Studio Light',
          abstract:
            'Comparing the naturalistic quality of interior window illumination against the controlled precision of studio flash: a study of environmental warmth as a signal of authenticity in first impression photography.',
        },
        {
          id: '015',
          title: 'Light Temperature and Perceived Warmth',
          abstract:
            'A study of how the color temperature of photographic illumination — from cool overcast daylight to warm tungsten — shapes emotional response, perceived personality, and first impressions of social openness.',
        },
      ],
    },
  ],
}
