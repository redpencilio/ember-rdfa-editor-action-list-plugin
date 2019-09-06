import { reads } from '@ember/object/computed';
import Component from '@ember/component';
import layout from '../../templates/components/editor-plugins/action-list-card';
import { inject as service } from '@ember/service';
import { A }  from '@ember/array';
import { computed }  from '@ember/object';

/**
* Card displaying a hint of the Date plugin
*
* @module editor-action-list-plugin
* @class ActionListCard
* @extends Ember.Component
*/
export default Component.extend({
  layout,
  store: service(),
  actionItems: A([]),

  /**
   * Region on which the card applies
   * @property location
   * @type [number,number]
   * @private
  */
  location: reads('info.location'),

  /**
   * Unique identifier of the event in the hints registry
   * @property hrId
   * @type Object
   * @private
  */
  hrId: reads('info.hrId'),

  /**
   * The RDFa editor instance
   * @property editor
   * @type RdfaEditor
   * @private
  */
  editor: reads('info.editor'),

  /**
   * Hints registry storing the cards
   * @property hintsRegistry
   * @type HintsRegistry
   * @private
  */
  hintsRegistry: reads('info.hintsRegistry'),

  async init() {
    this._super(...arguments);
    this.set('people', await this.store.findAll('person'));
    this.set('roles', await this.store.findAll('role'));
    this.set('memberships', (await this.store.findAll('membership')).sortBy('firstname'));
  },

  actions: {
    async addActionItem(){
      const item = this.store.createRecord('actionItem', {
        description: this.actionItemDescription,
        owner: this.selectedMembership
      });

      this.actionItems.pushObject(item);

      this.set('isAdding', false);

      this.set('actionItemDescription', '');
      this.set('selectedPerson', null);
      this.set('selectedRole', null);
    },

    commit(){
      debugger;
    },

    async createMembership(){
      const membership = this.store.createRecord('membership', {
        person: this.selectedPerson,
        role: this.selectedRole
      });
      await membership.save();
    },

    removeActionItem (item) {
      this.actionItems.removeObject(item);
      item.destroyRecord();
    },

    setOwner (event) {
      this.set('selectedMembership', this.memberships.find(m => m.id == event.currentTarget.value));
    },

    setPerson (event) {
      this.set('selectedPerson', this.people.find(person => person.id == event.currentTarget.value));
    },

    setRole (event) {
      this.set('selectedRole', this.roles.find(role => role.id == event.currentTarget.value));
    }
  }
});
