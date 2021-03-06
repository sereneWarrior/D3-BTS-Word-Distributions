/*Based on the d3v6 d3.chord() function by Mike Bostock
 ** Adjusted by Anne-Marie Grabbe - July 2021 */
import * as d3 from "d3";

const halfPi = Math.PI / 2;
const tau = Math.PI * 2;
const max = Math.max;

function range(i, j) {
  return Array.from({ length: j - i }, (_, k) => i + k);
}

function checkSubangle(index, groupangles, groups) {
  if (!groupangles[index]) groupangles[index] = groups[index].startAngle;
  return groupangles[index];
}

function compareValue(compare) {
  return function (a, b) {
    return compare(
      a.source.value + a.target.value,
      b.source.value + b.target.value
    );
  };
}

export function new_chord() {
  var padAngle = 0;

  function new_chord(d) {
    // calculate outer ringfrom grouped sequence
    const sequence = d;
    const nameMap = d3.group(d, (d) => d.Name);

    var n = sequence.length,
      entities = nameMap.size,
      groupSums = [],
      groupNames = Array.from(nameMap.keys()),
      chords = new Array(sequence.length),
      groups = new Array(entities),
      groupangles = new Array(entities),
      k = 0,
      dx;

    // TODO: iterate map
    nameMap.forEach((el) => {
      let x = el.length,
        sum = 0;
      for (let j = 0; j < x; j++) {
        sum += el[j].Words;
      }
      groupSums.push(sum);
      k += sum;
    });

    k = max(0, tau - padAngle * entities) / k;
    dx = k ? padAngle : tau / entities;

    {
      let x = 0;
      for (let i = 0; i < groupSums.length; i++) {
        groups[i] = {
          index: i,
          startAngle: x,
          endAngle: (x += groupSums[i] * k),
          value: groupSums[i],
          membername: groupNames[i],
        };
        x += dx;
      }

      for (let i = 0; i < n - 1; i++) {
        var index = groupNames.findIndex((el) => el === sequence[i].Name);
        var nextIndex = groupNames.findIndex(
          (el) => el === sequence[i + 1].Name
        );
        let chord = (chords[i] = { source: null, target: null });

        chord.source = {
          index: i,
          startAngle: checkSubangle(index, groupangles, groups),
          endAngle: (groupangles[index] += sequence[i].Words * k),
          value: sequence[i].Words,
          membername: groupNames[index],
          isStart: i === 0,
        };

        if (i !== n - 1) {
          chord.target = {
            index: nextIndex,
            startAngle: checkSubangle(nextIndex, groupangles, groups),
            endAngle: groupangles[nextIndex] + sequence[i + 1].Words * k,
            value: sequence[i + 1].Words,
            membername: groupNames[index],
            isEnd: i === n - 2,
          };
        }
      }
    }
    chords = Object.values(chords);
    chords.groups = groups;
    return chords;
  }
  new_chord.padAngle = function (_) {
    return arguments.length ? ((padAngle = max(0, _)), new_chord) : padAngle;
  };

  return new_chord;
}

export function chord(directed, transpose) {
  var padAngle = 0,
    sortGroups = null,
    sortSubgroups = null,
    sortChords = null;

  function chord(matrix) {
    var n = matrix.length,
      groupSums = new Array(n),
      groupIndex = range(0, n),
      chords = new Array(n * n),
      groups = new Array(n),
      k = 0,
      dx;

    matrix = Float64Array.from(
      { length: n * n },
      transpose
        ? (_, i) => matrix[i % n][(i / n) | 0]
        : (_, i) => matrix[(i / n) | 0][i % n]
    );

    // Compute the scaling factor from value to angle in [0, 2pi].
    for (let i = 0; i < n; ++i) {
      let x = 0;
      for (let j = 0; j < n; ++j)
        x += matrix[i * n + j] + directed * matrix[j * n + i];
      k += groupSums[i] = x;
    }
    k = max(0, tau - padAngle * n) / k;
    dx = k ? padAngle : tau / n;

    // Compute the angles for each group and constituent chord.
    {
      let x = 0;
      if (sortGroups)
        groupIndex.sort((a, b) => sortGroups(groupSums[a], groupSums[b]));
      for (const i of groupIndex) {
        const x0 = x;
        if (directed) {
          const subgroupIndex = range(~n + 1, n).filter((j) =>
            j < 0 ? matrix[~j * n + i] : matrix[i * n + j]
          );
          if (sortSubgroups)
            subgroupIndex.sort((a, b) =>
              sortSubgroups(
                a < 0 ? -matrix[~a * n + i] : matrix[i * n + a],
                b < 0 ? -matrix[~b * n + i] : matrix[i * n + b]
              )
            );
          for (const j of subgroupIndex) {
            if (j < 0) {
              const chord =
                chords[~j * n + i] ||
                (chords[~j * n + i] = { source: null, target: null });
              chord.target = {
                index: i,
                startAngle: x,
                endAngle: (x += matrix[~j * n + i] * k),
                value: matrix[~j * n + i],
              };
            } else {
              const chord =
                chords[i * n + j] ||
                (chords[i * n + j] = { source: null, target: null });
              chord.source = {
                index: i,
                startAngle: x,
                endAngle: (x += matrix[i * n + j] * k),
                value: matrix[i * n + j],
              };
            }
          }
          groups[i] = {
            index: i,
            startAngle: x0,
            endAngle: x,
            value: groupSums[i],
          };
        } else {
          const subgroupIndex = range(0, n).filter(
            (j) => matrix[i * n + j] || matrix[j * n + i]
          );
          if (sortSubgroups)
            subgroupIndex.sort((a, b) =>
              sortSubgroups(matrix[i * n + a], matrix[i * n + b])
            );
          for (const j of subgroupIndex) {
            let chord;
            if (i < j) {
              chord =
                chords[i * n + j] ||
                (chords[i * n + j] = { source: null, target: null });
              chord.source = {
                index: i,
                startAngle: x,
                endAngle: (x += matrix[i * n + j] * k),
                value: matrix[i * n + j],
              };
            } else {
              chord =
                chords[j * n + i] ||
                (chords[j * n + i] = { source: null, target: null });
              chord.target = {
                index: i,
                startAngle: x,
                endAngle: (x += matrix[i * n + j] * k),
                value: matrix[i * n + j],
              };
              if (i === j) chord.source = chord.target;
            }
            if (
              chord.source &&
              chord.target &&
              chord.source.value < chord.target.value
            ) {
              const source = chord.source;
              chord.source = chord.target;
              chord.target = source;
            }
          }
          groups[i] = {
            index: i,
            startAngle: x0,
            endAngle: x,
            value: groupSums[i],
          };
        }
        x += dx;
      }
    }

    // Remove empty chords.
    chords = Object.values(chords);
    chords.groups = groups;
    return sortChords ? chords.sort(sortChords) : chords;
  }

  chord.padAngle = function (_) {
    return arguments.length ? ((padAngle = max(0, _)), chord) : padAngle;
  };

  chord.sortGroups = function (_) {
    return arguments.length ? ((sortGroups = _), chord) : sortGroups;
  };

  chord.sortSubgroups = function (_) {
    return arguments.length ? ((sortSubgroups = _), chord) : sortSubgroups;
  };

  chord.sortChords = function (_) {
    return arguments.length
      ? (_ == null
          ? (sortChords = null)
          : ((sortChords = compareValue(_))._ = _),
        chord)
      : sortChords && sortChords._;
  };

  return chord;
}
