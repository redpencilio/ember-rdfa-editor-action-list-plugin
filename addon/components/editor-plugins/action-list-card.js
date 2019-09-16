import { reads } from '@ember/object/computed';
import Component from '@ember/component';
import layout from '../../templates/components/editor-plugins/action-list-card';
import { inject as service } from '@ember/service';
import { A }  from '@ember/array';
import { computed }  from '@ember/object';
import EmberObject from '@ember/object';

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
  selectedActions: A([]),

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

  canCommit: computed('status.{isCreating,status.isEditing,isSelecting}', 'selectedActions.[]', function(){
    return this.status.isEditing && this.selectedActions.length;
  }),

  innerHTML: computed('selectedActions.[]', function(){
    const list = this.selectedActions.map (action => `
      <li property="notable:AgendaItemProceedingsActionItem"
          typeof="pdo:ActionItem" >
        [<span property="notable:actionItemOwner"
              typeof="org:Membership">
          <span property="org:member"
                resource="http://data.notable.redpencil.io/persons/${action.get('owner.member.id')}"
                typeof="foaf:Person">
            <span property="foaf:firstName">${action.get('owner.member.firstname')}</span>
            <span> </span>
            <span property="foaf:lastName">${action.get('owner.member.lastname')}</span>
          </span>
        </span>]
        <span property="pdo:hasDescription">${action.description}</span>
      </li>`);

    return `
      <div class="text-gray-500 italic">
        <i class="edit icon"></i> Edit the list
      </div>
      <ol about="/agenda/item-1"
          property="dc:subject"
          resource="agenda/item-1/proceedings"
          typeof="notable:AgendaItemProceedings">
        ${list.join('')}
      </ol>`;
  }),

  nonSelectedActions: computed('allActions.[]', 'selectedActions.[]', function() {
    return this.allActions.filter(action => ! this.selectedActions.includes(action));
  }),

  async init() {
    this._super(...arguments);

    this.set('status', EmberObject.create({
      isAdding: false,
      isCreating: false,
      isEditing: true,
    }));

    this.set('people', await this.store.findAll('person'));
    this.set('roles', await this.store.findAll('role'));
    this.set('memberships', (await this.store.findAll('membership')).sortBy('firstname'));
    this.set('allActions', A([]));
    this.set('selectedActions', A([]));

    (await this.store.query('action-item', {
      include: 'owner.member'
    })).forEach(item => this.allActions.pushObject(item));
  },

  setStatus (status) {
    this.status.set('isCreating', status === 'isCreating');
    this.status.set('isEditing', status === 'isEditing');
    this.status.set('isSelecting', status === 'isSelecting');
  },

  actions: {
    async createAction(){
      // Create a new action
      const item = this.store.createRecord('actionItem', {
        description: this.actionItemDescription,
        owner: this.selectedMembership
      });

      // Push the newly created action to the list of selected actions without saving
      this.selectedActions.pushObject(item);

      // Show the list of selected actions
      this.setStatus('isEditing');

      // Reset the input fields to their default values
      this.set('actionItemDescription', '');
      this.set('selectedPerson', null);
      this.set('selectedRole', null);
    },

    async commit(){
      // First save all newly created actions
      await this.selectedActions.filter(item => ! item.id).forEach(async item => await item.save());

      const mappedLocation = this.get('hintsRegistry').updateLocationToCurrentIndex(this.get('hrId'), this.get('location'));
      this.get('hintsRegistry').removeHintsAtLocation(mappedLocation, this.get('hrId'), 'editor-plugins/attendee-list-card');

      const selection = this.editor.selectContext(mappedLocation, { typeof: this.info.typeof });
      this.editor.update(selection, {
        set: {
          innerHTML: this.innerHTML
        }
      });
      this.hintsRegistry.removeHintsAtLocation(this.location, this.hrId, this.who);
    },

    async createMembership(){
      const membership = this.store.createRecord('membership', {
        person: this.selectedPerson,
        role: this.selectedRole
      });
      await membership.save();
    },

    selectAction (action) {
      this.selectedActions.pushObject(action);
      this.setStatus('isEditing');
    },

    async deleteAction (action) {
      this.allActions.removeObject(action);
      await action.destroyRecord();
    },

    setOwner (event) {
      this.set('selectedMembership', this.memberships.find(m => m.id == event.currentTarget.value));
    },

    setPerson (event) {
      this.set('selectedPerson', this.people.find(person => person.id == event.currentTarget.value));
    },

    setRole (event) {
      this.set('selectedRole', this.roles.find(role => role.id == event.currentTarget.value));
    },

    setStatus (status) {
      this.setStatus(status);
    }
  }
});
