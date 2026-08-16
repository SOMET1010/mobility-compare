import { placeGroups } from '@/demo/scenario';

/**
 * Options des sélecteurs de lieu, regroupées par commune (optgroup natif —
 * lisible aussi dans les roues de sélection mobiles). Les quartiers rendent
 * l'estimation plus juste : « Cocody » seul couvre 12 km.
 */
export function PlaceOptions() {
  return (
    <>
      {placeGroups().map((g) => (
        <optgroup key={g.label} label={g.label}>
          {g.places.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </optgroup>
      ))}
    </>
  );
}
