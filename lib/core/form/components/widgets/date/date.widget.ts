/*!
 * @license
 * Copyright 2019 Alfresco Software, Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* tslint:disable:component-selector  */

import { UserPreferencesService, UserPreferenceValues } from '../../../../services/user-preferences.service';
import { MomentDateAdapter } from '../../../../utils/momentDateAdapter';
import { MOMENT_DATE_FORMATS } from '../../../../utils/moment-date-formats.model';
import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { DateAdapter, MAT_DATE_FORMATS } from '@angular/material';
import moment from 'moment-es6';
import { Moment } from 'moment';
import { FormService } from './../../../services/form.service';
import { baseHost, WidgetComponent } from './../widget.component';
import { AppConfigService } from '../../../../app-config/app-config.service';

@Component({
    selector: 'date-widget',
    providers: [
        { provide: DateAdapter, useClass: MomentDateAdapter },
        { provide: MAT_DATE_FORMATS, useValue: MOMENT_DATE_FORMATS }],
    templateUrl: './date.widget.html',
    styleUrls: ['./date.widget.scss'],
    host: baseHost,
    encapsulation: ViewEncapsulation.None
})
export class DateWidgetComponent extends WidgetComponent implements OnInit {

    minDate: Moment;
    maxDate: Moment;
    displayDate: Moment;
    dateFormat: string;

    constructor(public formService: FormService,
                private dateAdapter: DateAdapter<Moment>,
                private userPreferencesService: UserPreferencesService,
                private appConfig: AppConfigService) {
        super(formService);
        this.dateFormat = this.appConfig.get('dateFormat');
    }

    ngOnInit() {
        this.userPreferencesService.select(UserPreferenceValues.Locale).subscribe((locale) => {
            this.dateAdapter.setLocale(locale);
        });

        const momentDateAdapter = <MomentDateAdapter> this.dateAdapter;
        momentDateAdapter.overrideDisplayFormat = this.field.dateDisplayFormat;

        if (this.field) {
            if (this.field.minValue) {
                this.minDate = moment(this.field.minValue, this.dateFormat);
            }

            if (this.field.maxValue) {
                this.maxDate = moment(this.field.maxValue, this.dateFormat);
            }
        }
        this.displayDate = moment(this.field.value, this.field.dateDisplayFormat);
    }

    onDateChanged(newDateValue) {
        if (newDateValue && newDateValue.value) {
            this.field.value = newDateValue.value.format(this.field.dateDisplayFormat);
        } else if (newDateValue) {
            this.field.value = newDateValue;
        } else {
            this.field.value = null;
        }
        this.onFieldChanged(this.field);
    }

}
