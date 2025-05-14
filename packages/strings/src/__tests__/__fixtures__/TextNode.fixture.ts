// Contains the essential content of the AST representing "1:[A[1[a|b]|2[c|d]]|B] 2:[C|D]"
export default {
  children: [
    '1:',
    {
      variants: [
        {
          children: [
            'A',
            {
              variants: [
                {
                  children: ['1', { variants: ['a', 'b'] }],
                },
                {
                  children: ['2', { variants: ['c', 'd'] }],
                },
              ],
            },
          ],
        },
        'B',
      ],
    },
    ' 2:',
    {
      variants: ['C', 'D'],
    },
  ],
};
