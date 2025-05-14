export type EmptyObject = Record<string, never> | Record<number, never>;

export type HasRequiredKeys<BaseType extends object> = RequiredKeysOf<BaseType> extends never ? false : true;

export type Integer = number;

export type RequiredKeysOf<BaseType extends object> = Exclude<
  {
    [Key in keyof BaseType]: BaseType extends Record<Key, BaseType[Key]> ? Key : never;
  }[keyof BaseType],
  undefined
>;
