// import _ from 'lodash';
// <script src="//cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.4/lodash.min.js"></script>
// <script>

// FEATURES:
// DICE ROLLS:
// - 3d6
// - 4d6k3
// - 2d6+6

// CONSTRAINTS:
// - Straight
// - At least 2 scores >= X
// - At least 1 score >= X
// - Sum(mods) >= 2
// - Sum(mods) >= 1
// - Sum(scores) >= 70
 
interface Score {
    component_dice: number[];
    discarded_dice: number[];
}

type ScoreSet = Score[];

interface DiceRollMethod {
    (): Score;
}

interface ScoreSetValidator {
    (scoreSet: ScoreSet): boolean;
}

enum Attribute {
    str = "STR",
    dex = "DEX",
    con = "CON",
    int = "INT",
    wis = "WIS",
    cha = "CHA",
}

function d6() { return _.random(1, 6, false); }

function roll_3d6(): Score {
    return {
        component_dice: [d6(), d6(), d6()],
        discarded_dice: [],
    };
}

function roll_4d6k3(): Score {
    var the_dice = [d6(), d6(), d6(), d6()];
    var lowest_dice = the_dice.splice(_.min(the_dice), 1);
    return {
        component_dice: the_dice,
        discarded_dice: lowest_dice,
    };
}

function roll_2d6p6(): Score {
    return {
        component_dice: [6, d6(), d6()],
        discarded_dice: [],
    }
}

function roll_until_valid(diceRollMethod: DiceRollMethod, scoreSetValidator: ScoreSetValidator) {
    while(true) {
        var scores = _.times(6, diceRollMethod);
        if (scoreSetValidator(scores)) {
            return scores;
        }
    }
}

function calc_modifier(score: Score) {
    return Math.floor((_.sum(score.component_dice) - 10) / 2);
}

function print_score(score: Score, attr?: Attribute): string {
    var score_modifier: number = calc_modifier(score);
    var result: string[] = [];

    // Attribute Type (if applicable)
    if (attr) {
        result.push(attr, ": ");
    }

    // The score itself
    result.push(_.sum(score.component_dice).toString());

    // The modifier
    result.push(" (");
    if (score_modifier >= 0) { result.push("+"); }
    result.push(score_modifier.toString(), ")");

    // The composition of the score
    result.push(" [");
    result.push(score.component_dice.toString());

    // The discarded dice (if any)
    if (score.discarded_dice.length > 0) {
        result.push("(", score.discarded_dice.toString(), ")");
    }
    result.push("]");

    return result.join("");
}

function at_least_x_scores_of_y_value(scoreSet: ScoreSet, x: number, y: number) {
    return _(scoreSet)
        .map(score => score.component_dice)
        .map(dice => _.sum(dice))
        .filter(score => score >= x)
        .size() >= y;
}

function validate_colville_orig(scoreSet: ScoreSet) {
    return at_least_x_scores_of_y_value(scoreSet, 15, 2);
}

function validate_colville_lite(scoreSet: ScoreSet) {
    return at_least_x_scores_of_y_value(scoreSet, 15, 1);
}

function mod_of_at_least(scoreSet: ScoreSet, value: number) {
    return _(scoreSet).map(calc_modifier).sum().valueOf() >= value;
}

function validate_colville_neo(scoreSet: ScoreSet) {
    return mod_of_at_least(scoreSet, 2);
}

function validate_all(...validators: ScoreSetValidator[]) {
    return function(scoreSet: ScoreSet) {
        return _(validators)
        .map(validator => validator(scoreSet))
        .every();
    }
}

// </script>